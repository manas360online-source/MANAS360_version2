import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import exportController from '../controllers/export.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTherapistRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import { requireSessionOwnership } from '../middleware/ownership.middleware';

const router = Router();

// List sessions (keyset pagination)
router.get('/sessions', requireAuth, requireTherapistRole, asyncHandler(dashboardController.listSessions.bind(dashboardController)));

// Get full session detail (ownership enforced)
router.get('/sessions/:id', requireAuth, requireTherapistRole, asyncHandler(requireSessionOwnership), asyncHandler(dashboardController.getSession.bind(dashboardController)));

// Export job status
router.get('/exports/:jobId', requireAuth, requireTherapistRole, asyncHandler(exportController.getExportStatusController));

export default router;
