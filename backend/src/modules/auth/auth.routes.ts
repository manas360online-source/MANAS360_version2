import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.validation';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

/**
 * POST /auth/register
 * Register new user
 */
router.post('/register', validateRequest(registerSchema), authController.register);

/**
 * POST /auth/login
 * Login user
 */
router.post('/login', validateRequest(loginSchema), authController.login);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', validateRequest(refreshTokenSchema), authController.refresh);

/**
 * POST /auth/logout
 * Logout user (revoke refresh token)
 */
router.post('/logout', authenticate, authController.logout);

/**
 * GET /auth/me
 * Get current user
 */
router.get('/me', authenticate, authController.getMe);

export default router;
