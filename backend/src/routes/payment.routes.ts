import { Router } from 'express';
import {
	completeFinancialSessionController,
	createSessionPaymentController,
} from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { paymentRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.post('/sessions', requireAuth, requireRole('patient'), paymentRateLimiter, asyncHandler(createSessionPaymentController));
router.post('/sessions/:id/complete', requireAuth, requireRole('therapist'), paymentRateLimiter, asyncHandler(completeFinancialSessionController));

export default router;

