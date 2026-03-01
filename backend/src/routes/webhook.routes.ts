import { Router } from 'express';
import { razorpayWebhookController } from '../controllers/payment.controller';
import { webhookRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.post('/razorpay', webhookRateLimiter, asyncHandler(razorpayWebhookController));

export default router;

