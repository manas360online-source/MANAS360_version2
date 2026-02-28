import { Request, Response, NextFunction } from 'express';
import { PrismaClient, PaymentStatus, SessionStatus } from '@prisma/client';
import { razorpayService } from '../../services/razorpay.service';
import { WalletService } from '../wallet/wallet.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/error.middleware';
import { ERROR_CODES, HTTP_STATUS, WEBHOOK_EVENTS } from '../../utils/constants';
import { env } from '../../config/env';

const prisma = new PrismaClient();
const walletService = new WalletService();

export class PaymentWebhookController {
  /**
   * Handle Razorpay webhook
   * 
   * CRITICAL SECURITY:
   * 1. Verify HMAC signature
   * 2. Check idempotency (prevent duplicate processing)
   * 3. Never trust frontend payment confirmation
   * 4. Webhook is source of truth
   */
  async handleRazorpayWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // Get raw body and signature
      const rawBody = JSON.stringify(req.body);
      const signature = req.headers['x-razorpay-signature'] as string;

      if (!signature) {
        logger.error('Webhook signature missing');
        throw new AppError(
          'Signature missing',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_WEBHOOK_SIGNATURE
        );
      }

      // STEP 1: Verify signature
      const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        logger.error('Invalid webhook signature', {
          signature,
          body: req.body,
        });
        throw new AppError(
          'Invalid signature',
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.INVALID_WEBHOOK_SIGNATURE
        );
      }

      const { event, payload } = req.body;
      const eventId = payload.payment?.entity?.id || payload.subscription?.entity?.id || `event_${Date.now()}`;

      logger.info('Webhook received', {
        event,
        eventId,
      });

      // STEP 2: Check idempotency
      const existingLog = await prisma.webhookLog.findUnique({
        where: { eventId },
      });

      if (existingLog && existingLog.processed) {
        logger.info('Webhook already processed', { eventId });
        return res.status(HTTP_STATUS.OK).json({ status: 'already_processed' });
      }

      // STEP 3: Create webhook log
      await prisma.webhookLog.create({
        data: {
          provider: 'razorpay',
          eventId,
          eventType: event,
          payload,
          signature,
          verified: true,
          processed: false,
        },
      });

      // STEP 4: Handle event
      try {
        await handleWebhookEvent(event, payload);

        // Mark as processed
        await prisma.webhookLog.update({
          where: { eventId },
          data: {
            processed: true,
            processedAt: new Date(),
          },
        });

        logger.info('Webhook processed successfully', { eventId });
      } catch (error: any) {
        logger.error('Webhook processing failed', {
          eventId,
          error: error.message,
        });

        // Update webhook log with error
        await prisma.webhookLog.update({
          where: { eventId },
          data: {
            processed: false,
            errorMessage: error.message,
            retryCount: { increment: 1 },
          },
        });

        throw error;
      }

      // ALWAYS return 200 to Razorpay
      res.status(HTTP_STATUS.OK).json({ status: 'processed' });
    } catch (error) {
      // Log error but still return 200 to prevent retries
      logger.error('Webhook handler error', error);
      res.status(HTTP_STATUS.OK).json({ status: 'error', message: 'logged' });
    }
  }
}

/**
 * Handle specific webhook events
 * 
 * CENTRALIZED PAYMENT MODEL:
 * - All payments go to platform account
 * - Calculate 60/40 split
 * - Add provider share to pending balance
 * - Record platform revenue
 */
async function handleWebhookEvent(event: string, payload: any) {
  switch (event) {
    case WEBHOOK_EVENTS.PAYMENT_CAPTURED:
      await handlePaymentCaptured(payload);
      break;

    case WEBHOOK_EVENTS.PAYMENT_FAILED:
      await handlePaymentFailed(payload);
      break;

    case WEBHOOK_EVENTS.SUBSCRIPTION_ACTIVATED:
      await handleSubscriptionActivated(payload);
      break;

    case WEBHOOK_EVENTS.SUBSCRIPTION_CHARGED:
      await handleSubscriptionCharged(payload);
      break;

    default:
      logger.info('Unhandled webhook event', { event });
  }
}

/**
 * Handle payment.captured event
 * 
 * FLOW:
 * 1. Find payment record
 * 2. Mark as captured
 * 3. If session payment:
 *    a. Calculate split (60/40)
 *    b. Add provider share to pending balance
 *    c. Record platform revenue
 *    d. Mark session as confirmed
 */
async function handlePaymentCaptured(payload: any) {
  const paymentEntity = payload.payment.entity;
  const razorpayPaymentId = paymentEntity.id;
  const razorpayOrderId = paymentEntity.order_id;
  const amount = paymentEntity.amount; // In paise

  logger.info('Processing payment.captured', {
    razorpayPaymentId,
    razorpayOrderId,
    amount,
  });

  await prisma.$transaction(async (tx) => {
    // Find payment record
    const payment = await tx.payment.findUnique({
      where: { razorpayOrderId },
    });

    if (!payment) {
      logger.error('Payment not found for order', { razorpayOrderId });
      throw new Error('Payment not found');
    }

    // Check if already captured
    if (payment.status === PaymentStatus.CAPTURED) {
      logger.info('Payment already captured', { razorpayPaymentId });
      return;
    }

    // Update payment
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId,
        razorpaySignature: paymentEntity.signature,
        capturedAt: new Date(),
      },
    });

    // Handle based on payment type
    if (payment.referenceType === 'session' && payment.referenceId) {
      await handleSessionPaymentCaptured(tx, payment, amount);
    } else if (payment.referenceType === 'subscription' && payment.referenceId) {
      await handleSubscriptionPaymentCaptured(tx, payment);
    }
  });

  logger.info('Payment captured successfully', { razorpayPaymentId });
}

/**
 * Handle session payment captured
 * 
 * CENTRALIZED MODEL:
 * - Calculate 60/40 split
 * - Add to pending balance (not available yet)
 * - Will be released when session completes
 */
async function handleSessionPaymentCaptured(tx: any, payment: any, amount: number) {
  // Find session
  const session = await tx.session.findUnique({
    where: { id: payment.referenceId },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Calculate split
  const therapistShare = Math.floor(amount * (env.THERAPIST_SHARE_PERCENT / 100));
  const platformShare = amount - therapistShare;

  // Add to provider's pending balance
  const walletService = new WalletService();
  await walletService.addPendingBalance(session.providerId, therapistShare, {
    referenceType: 'session',
    referenceId: session.id,
    razorpayPaymentId: payment.razorpayPaymentId,
    totalAmount: amount,
    platformShare,
  });

  // Update session
  await tx.session.update({
    where: { id: session.id },
    data: {
      status: SessionStatus.CONFIRMED,
      fee: amount,
      platformCommission: platformShare,
      providerEarning: therapistShare,
    },
  });

  logger.info('Session payment processed', {
    sessionId: session.id,
    totalAmount: amount,
    therapistShare,
    platformShare,
  });
}

/**
 * Handle subscription payment captured
 */
async function handleSubscriptionPaymentCaptured(tx: any, payment: any) {
  // Update subscription status
  await tx.subscription.update({
    where: { id: payment.referenceId },
    data: {
      status: 'ACTIVE',
    },
  });

  logger.info('Subscription payment processed', {
    subscriptionId: payment.referenceId,
  });
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payload: any) {
  const paymentEntity = payload.payment.entity;
  const razorpayOrderId = paymentEntity.order_id;
  const failureReason = paymentEntity.error_description || 'Unknown error';

  logger.info('Processing payment.failed', {
    razorpayOrderId,
    failureReason,
  });

  await prisma.$transaction(async (tx) => {
    // Find payment
    const payment = await tx.payment.findUnique({
      where: { razorpayOrderId },
    });

    if (!payment) {
      logger.error('Payment not found for failed order', { razorpayOrderId });
      return;
    }

    // Update payment
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason,
      },
    });

    // If session payment, expire session
    if (payment.referenceType === 'session' && payment.referenceId) {
      await tx.session.update({
        where: { id: payment.referenceId },
        data: {
          status: SessionStatus.CANCELLED,
          cancellationReason: 'Payment failed',
          cancelledAt: new Date(),
        },
      });
    }
  });

  logger.info('Payment failure processed', { razorpayOrderId });
}

/**
 * Handle subscription.activated event
 */
async function handleSubscriptionActivated(payload: any) {
  const subscriptionEntity = payload.subscription.entity;
  const razorpaySubscriptionId = subscriptionEntity.id;

  logger.info('Processing subscription.activated', {
    razorpaySubscriptionId,
  });

  // Find subscription
  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId },
  });

  if (!subscription) {
    logger.error('Subscription not found', { razorpaySubscriptionId });
    return;
  }

  // Update subscription
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: new Date(subscriptionEntity.current_start * 1000),
      currentPeriodEnd: new Date(subscriptionEntity.current_end * 1000),
    },
  });

  logger.info('Subscription activated', { razorpaySubscriptionId });
}

/**
 * Handle subscription.charged event
 */
async function handleSubscriptionCharged(payload: any) {
  const subscriptionEntity = payload.subscription.entity;
  const razorpaySubscriptionId = subscriptionEntity.id;

  logger.info('Processing subscription.charged', {
    razorpaySubscriptionId,
  });

  // Update subscription period
  await prisma.subscription.update({
    where: { razorpaySubscriptionId },
    data: {
      currentPeriodStart: new Date(subscriptionEntity.current_start * 1000),
      currentPeriodEnd: new Date(subscriptionEntity.current_end * 1000),
    },
  });

  logger.info('Subscription charged', { razorpaySubscriptionId });
}
