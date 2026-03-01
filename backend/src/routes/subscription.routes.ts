import { Router } from 'express';
import {
	createSubscriptionController,
	getMySubscriptionsController,
} from '../controllers/subscription.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { paymentRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.post('/', requireAuth, paymentRateLimiter, asyncHandler(createSubscriptionController));
router.get('/me', requireAuth, asyncHandler(getMySubscriptionsController));

export default router;

