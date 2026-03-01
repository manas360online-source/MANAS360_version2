import crypto from 'crypto';
import { env } from '../config/env';

const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

const getAuthHeader = (): string => {
	if (!env.razorpayKeyId || !env.razorpayKeySecret) {
		throw new Error('Razorpay credentials are not configured');
	}

	return `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')}`;
};

export interface RazorpayOrderInput {
	amountMinor: number;
	currency: string;
	receipt: string;
	notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
	id: string;
	entity: string;
	amount: number;
	amount_paid: number;
	amount_due: number;
	currency: string;
	receipt: string;
	status: string;
}

export interface RazorpaySubscriptionInput {
	planId: string;
	totalCount?: number;
	quantity?: number;
	notes?: Record<string, string>;
}

export interface RazorpaySubscriptionResponse {
	id: string;
	entity: string;
	plan_id: string;
	status: string;
	current_start?: number;
	current_end?: number;
	next_charge_at?: number;
}

const parseJsonOrThrow = async (response: Response): Promise<any> => {
	const raw = await response.text();
	const parsed = raw ? JSON.parse(raw) : {};

	if (!response.ok) {
		throw new Error(parsed?.error?.description ?? `Razorpay API error (${response.status})`);
	}

	return parsed;
};

export const createRazorpayOrder = async (input: RazorpayOrderInput): Promise<RazorpayOrderResponse> => {
	const response = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
		method: 'POST',
		headers: {
			Authorization: getAuthHeader(),
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			amount: input.amountMinor,
			currency: input.currency,
			receipt: input.receipt,
			notes: input.notes,
		}),
	});

	return parseJsonOrThrow(response);
};

export const createRazorpaySubscription = async (
	input: RazorpaySubscriptionInput,
): Promise<RazorpaySubscriptionResponse> => {
	const response = await fetch(`${RAZORPAY_BASE_URL}/subscriptions`, {
		method: 'POST',
		headers: {
			Authorization: getAuthHeader(),
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			plan_id: input.planId,
			total_count: input.totalCount ?? 120,
			quantity: input.quantity ?? 1,
			notes: input.notes,
		}),
	});

	return parseJsonOrThrow(response);
};

export const verifyRazorpayWebhookSignature = (
	rawBody: string,
	receivedSignature: string,
	secret: string,
): boolean => {
	const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
	const digestBuf = Buffer.from(digest, 'utf8');
	const sigBuf = Buffer.from(receivedSignature, 'utf8');

	if (digestBuf.length !== sigBuf.length) {
		return false;
	}

	return crypto.timingSafeEqual(digestBuf, sigBuf);
};

export const verifyRazorpayPaymentSignature = (
	razorpayOrderId: string,
	razorpayPaymentId: string,
	receivedSignature: string,
	secret: string,
): boolean => {
	const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
	const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');
	const digestBuf = Buffer.from(digest, 'utf8');
	const sigBuf = Buffer.from(receivedSignature, 'utf8');

	if (digestBuf.length !== sigBuf.length) {
		return false;
	}

	return crypto.timingSafeEqual(digestBuf, sigBuf);
};

import Razorpay from 'razorpay';
import { env } from '../config/env';
import { cryptoUtils } from '../utils/crypto';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';

const razorpayInstance = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

interface CreateOrderInput {
  amount: number; // In paise
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
}

export class RazorpayService {
  /**
   * Create Razorpay order
   * @param input - Order details
   * @returns Razorpay order object
   */
  async createOrder(input: CreateOrderInput) {
    try {
      const order = await razorpayInstance.orders.create({
        amount: input.amount,
        currency: input.currency || 'INR',
        receipt: input.receipt || `receipt_${Date.now()}`,
        notes: input.notes || {},
      });

      logger.info('Razorpay order created', {
        orderId: order.id,
        amount: order.amount,
        receipt: order.receipt,
      });

      return order;
    } catch (error: any) {
      logger.error('Failed to create Razorpay order', {
        error: error.message,
        input,
      });
      throw new AppError(
        'Failed to create payment order',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.PAYMENT_FAILED
      );
    }
  }

  /**
   * Verify webhook signature using HMAC SHA256
   * CRITICAL: Never trust payload without signature verification
   * 
   * @param payload - Raw webhook body (string)
   * @param signature - X-Razorpay-Signature header
   * @returns boolean - true if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = cryptoUtils.hmacSHA256(payload, env.RAZORPAY_WEBHOOK_SECRET);
      
      // Use timing-safe comparison
      const isValid = cryptoUtils.verifyHMAC(payload, signature, env.RAZORPAY_WEBHOOK_SECRET);

      if (!isValid) {
        logger.error('Webhook signature verification failed', {
          receivedSignature: signature,
          expectedSignature,
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying webhook signature', error);
      return false;
    }
  }

  /**
   * Fetch payment details from Razorpay
   * @param paymentId - Razorpay payment ID
   */
  async fetchPayment(paymentId: string) {
    try {
      const payment = await razorpayInstance.payments.fetch(paymentId);
      return payment;
    } catch (error: any) {
      logger.error('Failed to fetch payment', {
        error: error.message,
        paymentId,
      });
      throw new AppError(
        'Failed to fetch payment details',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.PAYMENT_FAILED
      );
    }
  }

  /**
   * Capture payment (for authorized payments)
   * @param paymentId - Razorpay payment ID
   * @param amount - Amount to capture in paise
   */
  async capturePayment(paymentId: string, amount: number) {
    try {
      const payment = await razorpayInstance.payments.capture(paymentId, amount, 'INR');
      
      logger.info('Payment captured', {
        paymentId,
        amount,
      });

      return payment;
    } catch (error: any) {
      logger.error('Failed to capture payment', {
        error: error.message,
        paymentId,
        amount,
      });
      throw new AppError(
        'Failed to capture payment',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.PAYMENT_FAILED
      );
    }
  }

  /**
   * Create subscription
   * @param planId - Razorpay plan ID
   * @param customerId - Customer ID
   * @param totalCount - Total billing cycles
   */
  async createSubscription(input: {
    planId: string;
    customerId?: string;
    totalCount?: number;
    notes?: Record<string, any>;
  }) {
    try {
      const subscription = await razorpayInstance.subscriptions.create({
        plan_id: input.planId,
        customer_id: input.customerId,
        total_count: input.totalCount || 12,
        notes: input.notes || {},
      });

      logger.info('Subscription created', {
        subscriptionId: subscription.id,
        planId: input.planId,
      });

      return subscription;
    } catch (error: any) {
      logger.error('Failed to create subscription', {
        error: error.message,
        input,
      });
      throw new AppError(
        'Failed to create subscription',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.PAYMENT_FAILED
      );
    }
  }
}

export const razorpayService = new RazorpayService();
