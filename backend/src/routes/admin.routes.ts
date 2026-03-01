import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
	validateAdminListUsersQuery,
	validateAdminGetUserIdParam,
	validateTherapistProfileIdParam,
	validateAdminListSubscriptionsQuery,
	asyncHandler,
} from '../middleware/validate.middleware';
import { listUsersController, getUserController, verifyTherapistController, getMetricsController, listSubscriptionsController } from '../controllers/admin.controller';

const router = Router();

/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 * Query parameters:
 *   - role: 'patient' | 'therapist' | 'admin' (optional)
 *   - status: 'active' | 'deleted' (optional)
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 10, max: 50)
 */
router.get('/users', requireAuth, requireRole('admin'), ...validateAdminListUsersQuery, asyncHandler(listUsersController));

/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Route parameters:
 *   - id: user identifier
 */
router.get('/users/:id', requireAuth, requireRole('admin'), ...validateAdminGetUserIdParam, asyncHandler(getUserController));

/**
 * PATCH /api/v1/admin/therapists/:id/verify
 * Verify therapist credentials
 * Sets isVerified = true and records verification timestamp
 * Route parameters:
 *   - id: therapist identifier
 * Response: Updated therapist profile summary
 */
router.patch(
	'/therapists/:id/verify',
	requireAuth,
	requireRole('admin'),
	...validateTherapistProfileIdParam,
	asyncHandler(verifyTherapistController),
);

/**
 * GET /api/v1/admin/metrics
 * Get comprehensive platform metrics
 * No query parameters required
 * Response includes:
 *   - totalUsers: Count of active users
 *   - totalTherapists: Count of therapist profiles
 *   - verifiedTherapists: Count of verified therapists
 *   - completedSessions: Count of completed therapy sessions
 *   - totalRevenue: Sum of all transaction amounts
 *   - activeSubscriptions: Count of therapists with active patients
 */
router.get('/metrics', requireAuth, requireRole('admin'), asyncHandler(getMetricsController));

/**
 * GET /api/v1/admin/subscriptions
 * List all active subscriptions with pagination and filters
 * Query parameters:
 *   - planType: 'basic' | 'premium' | 'pro' (optional)
 *   - status: 'active' | 'expired' | 'cancelled' | 'paused' (optional, default: 'active')
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 10, max: 50)
 * Response: Paginated list of subscriptions with user and plan details
 */
router.get('/subscriptions', requireAuth, requireRole('admin'), ...validateAdminListSubscriptionsQuery, asyncHandler(listSubscriptionsController));

export default router;
