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

