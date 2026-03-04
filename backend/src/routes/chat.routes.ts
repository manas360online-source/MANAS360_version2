import { Router } from 'express';
import { postChatMessageController } from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { chatRateLimiter } from '../middleware/chatRateLimiter';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.post(
	'/message',
	requireAuth,
	requireRole(['patient', 'therapist', 'psychiatrist', 'coach', 'admin', 'superadmin']),
	chatRateLimiter,
	asyncHandler(postChatMessageController),
);

export default router;
