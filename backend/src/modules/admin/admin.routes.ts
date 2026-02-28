import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { approvePayoutSchema, rejectPayoutSchema } from './admin.validation';

const router = Router();
const adminController = new AdminController();

// All routes require admin authentication
router.use(authenticate);
router.use(requireRole('ADMIN'));

/**
 * GET /admin/payouts
 * Get all payout requests
 */
router.get('/payouts', adminController.getPayoutRequests);

/**
 * POST /admin/payouts/:id/approve
 * Approve payout request
 */
router.post(
  '/payouts/:id/approve',
  validateRequest(approvePayoutSchema),
  adminController.approvePayout
);

/**
 * POST /admin/payouts/:id/reject
 * Reject payout request
 */
router.post(
  '/payouts/:id/reject',
  validateRequest(rejectPayoutSchema),
  adminController.rejectPayout
);

/**
 * GET /admin/stats
 * Get platform statistics
 */
router.get('/stats', adminController.getPlatformStats);

/**
 * GET /admin/providers
 * Get all providers
 */
router.get('/providers', adminController.getProviders);

/**
 * POST /admin/providers/:id/verify
 * Verify provider
 */
router.post('/providers/:id/verify', adminController.verifyProvider);

/**
 * GET /admin/sessions
 * Get all sessions
 */
router.get('/sessions', adminController.getSessions);

export default router;
