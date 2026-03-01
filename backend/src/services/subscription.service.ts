import crypto from 'crypto';
import { createClient } from 'redis';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import {
	createRazorpaySubscription,
	verifyRazorpayWebhookSignature,
} from './razorpay.service';

const db = prisma as any;
const redis = createClient({ url: env.redisUrl });
redis.on('error', (error) => {
	console.warn('[subscription.service] Redis unavailable, continuing with degraded idempotency cache', error);
});
void redis.connect().catch(() => undefined);

const sha256 = (input: string): string => crypto.createHash('sha256').update(input).digest('hex');

export const createMarketplaceSubscription = async (input: {
	userId: string;
	domain: 'PATIENT' | 'PROVIDER';
	plan: 'BASIC' | 'PREMIUM' | 'LEAD_PLAN';
	razorpayPlanId: string;
}) => {
	const existingActive = await db.marketplaceSubscription.findFirst({
		where: {
			userId: input.userId,
			domain: input.domain,
			status: { in: ['ACTIVE', 'PAST_DUE'] },
		},
	});

	if (existingActive) {
		throw new AppError('An active/past-due subscription already exists', 409);
	}

	const remote = await createRazorpaySubscription({
		planId: input.razorpayPlanId,
		notes: {
			userId: input.userId,
			domain: input.domain,
			plan: input.plan,
		},
	});

	const created = await db.marketplaceSubscription.create({
		data: {
			userId: input.userId,
			domain: input.domain,
			plan: input.plan,
			status: 'PAST_DUE',
			razorpaySubscriptionId: remote.id,
			razorpayPlanId: input.razorpayPlanId,
		},
	});

	return {
		subscriptionId: created.id,
		razorpaySubscriptionId: created.razorpaySubscriptionId,
		status: created.status,
	};
};

export const processSubscriptionWebhook = async (
	rawBody: string,
	signature: string,
): Promise<{ handled: boolean; message: string }> => {
	if (!env.razorpayWebhookSecret) {
		throw new AppError('RAZORPAY_WEBHOOK_SECRET not configured', 500);
	}

	if (!verifyRazorpayWebhookSignature(rawBody, signature, env.razorpayWebhookSecret)) {
		throw new AppError('Invalid Razorpay webhook signature', 401);
	}

	const event = JSON.parse(rawBody) as any;
	const eventId = String(event?.id ?? '');
	const eventType = String(event?.event ?? '');

	if (!eventId || !eventType) {
		throw new AppError('Invalid webhook payload', 422);
	}

	const cacheKey = `webhook:subscription:${eventId}`;
	const setOk = await redis.set(cacheKey, '1', {
		NX: true,
		EX: env.webhookIdempotencyTtlSeconds,
	});
	if (!setOk) {
		return { handled: true, message: 'Duplicate subscription webhook (cache)' };
	}

	const payloadHash = sha256(rawBody);
	try {
		await db.webhookLog.create({
			data: {
				provider: 'RAZORPAY',
				eventId,
				eventType,
				payloadHash,
				signature,
				isSignatureValid: true,
				processStatus: 'RECEIVED',
				rawPayload: event,
			},
		});
	} catch {
		return { handled: true, message: 'Duplicate subscription webhook (db)' };
	}

	const subscriptionEntity =
		event?.payload?.subscription?.entity ?? event?.payload?.payment?.entity?.subscription;
	const razorpaySubscriptionId = String(subscriptionEntity?.id ?? subscriptionEntity ?? '');

	if (!razorpaySubscriptionId) {
		await db.webhookLog.updateMany({
			where: { eventId },
			data: { processStatus: 'FAILED', errorMessage: 'Missing subscription id', processedAt: new Date() },
		});
		throw new AppError('Subscription id missing in webhook payload', 422);
	}

	await db.$transaction(async (tx: any) => {
		const sub = await tx.marketplaceSubscription.findUnique({
			where: { razorpaySubscriptionId },
		});
		if (!sub) {
			throw new AppError('Subscription not found', 404);
		}

		if (eventType === 'subscription.activated') {
			await tx.marketplaceSubscription.update({
				where: { id: sub.id },
				data: {
					status: 'ACTIVE',
					currentPeriodStart: subscriptionEntity?.current_start
						? new Date(Number(subscriptionEntity.current_start) * 1000)
						: sub.currentPeriodStart,
					currentPeriodEnd: subscriptionEntity?.current_end
						? new Date(Number(subscriptionEntity.current_end) * 1000)
						: sub.currentPeriodEnd,
					nextBillingDate: subscriptionEntity?.next_charge_at
						? new Date(Number(subscriptionEntity.next_charge_at) * 1000)
						: sub.nextBillingDate,
				},
			});
		}

		if (eventType === 'subscription.charged') {
			const paymentEntity = event?.payload?.payment?.entity;
			const amountMinor = Number(paymentEntity?.amount ?? 0);
			const billedAtUnix = Number(paymentEntity?.created_at ?? Date.now() / 1000);

			await tx.subscriptionInvoice.create({
				data: {
					subscriptionId: sub.id,
					razorpayPaymentId: String(paymentEntity?.id ?? ''),
					amountMinor,
					currency: String(paymentEntity?.currency ?? 'INR'),
					billedAt: new Date(billedAtUnix * 1000),
					nextBillingDate: subscriptionEntity?.next_charge_at
						? new Date(Number(subscriptionEntity.next_charge_at) * 1000)
						: null,
				},
			});

			await tx.revenueLedger.create({
				data: {
					type: 'SUBSCRIPTION',
					grossAmountMinor: amountMinor,
					platformCommissionMinor: amountMinor,
					providerShareMinor: 0,
					taxAmountMinor: 0,
					currency: String(paymentEntity?.currency ?? 'INR'),
					referenceId: sub.id,
					subscriptionId: sub.id,
				},
			});

			await tx.marketplaceSubscription.update({
				where: { id: sub.id },
				data: {
					status: 'ACTIVE',
					nextBillingDate: subscriptionEntity?.next_charge_at
						? new Date(Number(subscriptionEntity.next_charge_at) * 1000)
						: sub.nextBillingDate,
				},
			});
		}

		if (eventType === 'payment.failed') {
			await tx.marketplaceSubscription.update({
				where: { id: sub.id },
				data: { status: 'PAST_DUE' },
			});
		}

		if (eventType === 'subscription.cancelled') {
			await tx.marketplaceSubscription.update({
				where: { id: sub.id },
				data: { status: 'CANCELLED', cancelledAt: new Date() },
			});
		}

		await tx.webhookLog.updateMany({
			where: { provider: 'RAZORPAY', eventId },
			data: {
				processStatus: 'PROCESSED',
				processedAt: new Date(),
				subscriptionId: sub.id,
			},
		});
	});

	return { handled: true, message: `${eventType} processed` };
};

