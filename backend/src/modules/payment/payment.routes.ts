import { Router, Request, Response, NextFunction } from 'express';
import { PaymentWebhookController } from './payment.webhook.controller';
import { strictRateLimit } from '../../middleware/rateLimit.middleware';

const router = Router();
const webhookController = new PaymentWebhookController();

/**
 * POST /webhooks/razorpay
 * Handle Razorpay webhooks
 * 
 * CRITICAL:
 * - Verify signature before processing
 * - Check idempotency (duplicate events)
 * - Return 200 immediately
 * - Process async if needed
 */
router.post(
  '/razorpay',
  strictRateLimit(100, 60000), // 100 requests per minute
  // Raw body parser middleware (handled in app.ts)
  webhookController.handleRazorpayWebhook
);

export default router;
