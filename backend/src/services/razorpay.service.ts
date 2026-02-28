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
