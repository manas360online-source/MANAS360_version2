"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 * Query parameters:
 *   - role: 'patient' | 'therapist' | 'admin' (optional)
 *   - status: 'active' | 'deleted' (optional)
 *   - page: pagination page number (default: 1)
 *   - limit: items per page (default: 10, max: 50)
 */
router.get('/users', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), ...validate_middleware_1.validateAdminListUsersQuery, (0, validate_middleware_1.asyncHandler)(admin_controller_1.listUsersController));
/**
 * GET /api/v1/admin/users/:id
 * Get a single user by ID
 * Route parameters:
 *   - id: user identifier
 */
router.get('/users/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), ...validate_middleware_1.validateAdminGetUserIdParam, (0, validate_middleware_1.asyncHandler)(admin_controller_1.getUserController));
/**
 * PATCH /api/v1/admin/therapists/:id/verify
 * Verify therapist credentials
 * Sets isVerified = true and records verification timestamp
 * Route parameters:
 *   - id: therapist identifier
 * Response: Updated therapist profile summary
 */
router.patch('/therapists/:id/verify', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), ...validate_middleware_1.validateTherapistProfileIdParam, (0, validate_middleware_1.asyncHandler)(admin_controller_1.verifyTherapistController));
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
router.get('/metrics', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), (0, validate_middleware_1.asyncHandler)(admin_controller_1.getMetricsController));
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
router.get('/subscriptions', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requireRole)('admin'), ...validate_middleware_1.validateAdminListSubscriptionsQuery, (0, validate_middleware_1.asyncHandler)(admin_controller_1.listSubscriptionsController));
exports.default = router;
