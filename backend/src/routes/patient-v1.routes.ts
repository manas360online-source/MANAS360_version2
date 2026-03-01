import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
	aiChatController,
	bookSessionController,
	createMoodController,
	getPatientDashboardController,
	getProviderByIdController,
	listNotificationsController,
	listProvidersController,
	markNotificationReadController,
	moodHistoryController,
	sessionHistoryController,
	submitAssessmentController,
	upcomingSessionsController,
	verifyPaymentController,
} from '../controllers/patient-v1.controller';

const router = Router();

router.get('/patient/dashboard', requireAuth, requireRole('patient'), asyncHandler(getPatientDashboardController));

router.get('/providers', requireAuth, requireRole('patient'), asyncHandler(listProvidersController));
router.get('/providers/:id', requireAuth, requireRole('patient'), asyncHandler(getProviderByIdController));

router.post('/sessions/book', requireAuth, requireRole('patient'), asyncHandler(bookSessionController));
router.get('/sessions/upcoming', requireAuth, requireRole('patient'), asyncHandler(upcomingSessionsController));
router.get('/sessions/history', requireAuth, requireRole('patient'), asyncHandler(sessionHistoryController));

router.post('/payments/verify', requireAuth, requireRole('patient'), asyncHandler(verifyPaymentController));

router.post('/assessments/submit', requireAuth, requireRole('patient'), asyncHandler(submitAssessmentController));

router.post('/mood', requireAuth, requireRole('patient'), asyncHandler(createMoodController));
router.get('/mood/history', requireAuth, requireRole('patient'), asyncHandler(moodHistoryController));

router.post('/ai/chat', requireAuth, requireRole('patient'), asyncHandler(aiChatController));

router.get('/notifications', requireAuth, requireRole('patient'), asyncHandler(listNotificationsController));
router.patch('/notifications/:id/read', requireAuth, requireRole('patient'), asyncHandler(markNotificationReadController));

export default router;
