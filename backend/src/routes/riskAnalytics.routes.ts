import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
	acknowledgeEscalationController,
	getCurrentRiskController,
	getMoodAccuracyController,
	getMoodHistoryController,
	getMoodPredictionController,
	getOpenEscalationsController,
	getRiskHistoryController,
	resolveEscalationController,
} from '../controllers/riskAnalytics.controller';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['patient', 'therapist', 'psychiatrist', 'coach', 'admin', 'superadmin']));

router.get('/risk/:userId/current', asyncHandler(getCurrentRiskController));
router.get('/risk/:userId/history', asyncHandler(getRiskHistoryController));

router.get('/mood/:userId/prediction', asyncHandler(getMoodPredictionController));
router.get('/mood/:userId/history', asyncHandler(getMoodHistoryController));
router.get('/mood/:userId/accuracy', asyncHandler(getMoodAccuracyController));

router.get('/escalations/open', asyncHandler(getOpenEscalationsController));
router.post('/escalations/:id/acknowledge', asyncHandler(acknowledgeEscalationController));
router.post('/escalations/:id/resolve', asyncHandler(resolveEscalationController));

export default router;
