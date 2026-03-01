import { Router } from 'express';
import {
	googleLoginController,
	loginController,
	logoutController,
	meController,
	mfaSetupController,
	mfaVerifyController,
	registerController,
	refreshTokenController,
	requestPasswordResetController,
	revokeSessionController,
	resetPasswordController,
	sessionsController,
	signupWithEmailController,
	signupWithPhoneController,
	verifyEmailOtpController,
	verifyPhoneOtpController,
} from '../controllers/auth.controller';
import { requireAuth, requireCsrf } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import { asyncHandler } from '../middleware/validate.middleware';

const router = Router();

router.post('/register', authRateLimiter, asyncHandler(registerController));
router.post('/signup/email', authRateLimiter, asyncHandler(signupWithEmailController));
router.post('/verify/email-otp', authRateLimiter, asyncHandler(verifyEmailOtpController));
router.post('/signup/phone', authRateLimiter, asyncHandler(signupWithPhoneController));
router.post('/verify/phone-otp', authRateLimiter, asyncHandler(verifyPhoneOtpController));

router.post('/login', authRateLimiter, asyncHandler(loginController));
router.post('/login/google', authRateLimiter, asyncHandler(googleLoginController));
router.post('/refresh', authRateLimiter, requireCsrf, asyncHandler(refreshTokenController));

router.post('/password/forgot', authRateLimiter, asyncHandler(requestPasswordResetController));
router.post('/password/reset', authRateLimiter, asyncHandler(resetPasswordController));

router.post('/mfa/setup', requireAuth, asyncHandler(mfaSetupController));
router.post('/mfa/verify', requireAuth, asyncHandler(mfaVerifyController));

router.get('/me', requireAuth, asyncHandler(meController));
router.get('/sessions', requireAuth, asyncHandler(sessionsController));
router.delete('/sessions/:sessionId', requireAuth, asyncHandler(revokeSessionController));
router.post('/logout', requireAuth, requireCsrf, asyncHandler(logoutController));

export default router;
