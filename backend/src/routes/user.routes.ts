import { Router } from 'express';
import {
	deleteMySessionController,
	deleteMySessionsController,
	deleteMeController,
	getMeController,
	getMySessionsController,
	patchMePasswordController,
	patchMeController,
	uploadMePhotoController,
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { userSessionRateLimiter } from '../middleware/rateLimiter.middleware';
import {
	asyncHandler,
	uploadProfilePhotoMiddleware,
	validateChangePasswordRequest,
	validateSessionIdParam,
	validateUpdateMeRequest,
} from '../middleware/validate.middleware';

const router = Router();

router.get('/me', requireAuth, asyncHandler(getMeController));
router.patch('/me', requireAuth, ...validateUpdateMeRequest, asyncHandler(patchMeController));
router.patch('/me/password', requireAuth, ...validateChangePasswordRequest, asyncHandler(patchMePasswordController));
router.post('/me/photo', requireAuth, uploadProfilePhotoMiddleware, asyncHandler(uploadMePhotoController));
router.get('/me/sessions', requireAuth, userSessionRateLimiter, asyncHandler(getMySessionsController));
router.delete('/me/sessions', requireAuth, userSessionRateLimiter, asyncHandler(deleteMySessionsController));
router.delete(
	'/me/sessions/:id',
	requireAuth,
	userSessionRateLimiter,
	...validateSessionIdParam,
	asyncHandler(deleteMySessionController),
);
router.delete('/me', requireAuth, asyncHandler(deleteMeController));

export default router;

