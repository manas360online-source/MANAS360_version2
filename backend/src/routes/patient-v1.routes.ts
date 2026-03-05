import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
	aiChatController,
	bookSessionController,
	cancelPatientSubscriptionController,
	completePatientExerciseController,
	createMoodController,
	downloadPatientInvoiceController,
	downgradePatientSubscriptionController,
	getPatientExercisesController,
	getPatientMoodStatsController,
	getPatientMoodTodayController,
	getPatientProgressController,
	getPatientDashboardController,
	getPatientInvoicesController,
	getPatientMoodController,
	getPatientPaymentMethodController,
	getPatientSubscriptionController,
	getProviderByIdController,
	listNotificationsController,
	listProvidersController,
	markNotificationReadController,
	moodHistoryController,
	reactivatePatientSubscriptionController,
	sessionInvoicePdfController,
	sessionDetailController,
	sessionHistoryController,
	sessionSummaryPdfController,
	submitAssessmentController,
	togglePatientSubscriptionAutoRenewController,
	upcomingSessionsController,
	updatePatientPaymentMethodController,
	upgradePatientSubscriptionController,
	verifyPaymentController,
} from '../controllers/patient-v1.controller';

const router = Router();

router.get('/patient/dashboard', requireAuth, requireRole('patient'), asyncHandler(getPatientDashboardController));

router.get('/providers', requireAuth, requireRole('patient'), asyncHandler(listProvidersController));
router.get('/providers/:id', requireAuth, requireRole('patient'), asyncHandler(getProviderByIdController));

router.post('/sessions/book', requireAuth, requireRole('patient'), asyncHandler(bookSessionController));
router.get('/sessions/upcoming', requireAuth, requireRole('patient'), asyncHandler(upcomingSessionsController));
router.get('/sessions/history', requireAuth, requireRole('patient'), asyncHandler(sessionHistoryController));
router.get('/sessions/:id/documents/session-pdf', requireAuth, requireRole('patient'), asyncHandler(sessionSummaryPdfController));
router.get('/sessions/:id/documents/invoice', requireAuth, requireRole('patient'), asyncHandler(sessionInvoicePdfController));
router.get('/sessions/:id', requireAuth, requireRole('patient'), asyncHandler(sessionDetailController));

router.post('/payments/verify', requireAuth, requireRole('patient'), asyncHandler(verifyPaymentController));

router.post('/assessments/submit', requireAuth, requireRole('patient'), asyncHandler(submitAssessmentController));

router.post('/mood', requireAuth, requireRole('patient'), asyncHandler(createMoodController));
router.get('/mood/history', requireAuth, requireRole('patient'), asyncHandler(moodHistoryController));
router.get('/mood/today', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodTodayController));
router.get('/mood/stats', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodStatsController));

router.get('/patient/progress', requireAuth, requireRole('patient'), asyncHandler(getPatientProgressController));

router.post('/ai/chat', requireAuth, requireRole('patient'), asyncHandler(aiChatController));

router.get('/notifications', requireAuth, requireRole('patient'), asyncHandler(listNotificationsController));
router.patch('/notifications/:id/read', requireAuth, requireRole('patient'), asyncHandler(markNotificationReadController));

router.get('/subscription', requireAuth, requireRole('patient'), asyncHandler(getPatientSubscriptionController));
router.patch('/subscription/upgrade', requireAuth, requireRole('patient'), asyncHandler(upgradePatientSubscriptionController));
router.patch('/subscription/downgrade', requireAuth, requireRole('patient'), asyncHandler(downgradePatientSubscriptionController));
router.patch('/subscription/cancel', requireAuth, requireRole('patient'), asyncHandler(cancelPatientSubscriptionController));
router.patch('/subscription/reactivate', requireAuth, requireRole('patient'), asyncHandler(reactivatePatientSubscriptionController));
router.patch('/subscription/auto-renew', requireAuth, requireRole('patient'), asyncHandler(togglePatientSubscriptionAutoRenewController));

router.get('/payment-method', requireAuth, requireRole('patient'), asyncHandler(getPatientPaymentMethodController));
router.put('/payment-method', requireAuth, requireRole('patient'), asyncHandler(updatePatientPaymentMethodController));

router.get('/invoices', requireAuth, requireRole('patient'), asyncHandler(getPatientInvoicesController));
router.get('/invoices/:id/download', requireAuth, requireRole('patient'), asyncHandler(downloadPatientInvoiceController));

router.get('/mood', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodController));

router.get('/exercises', requireAuth, requireRole('patient'), asyncHandler(getPatientExercisesController));
router.patch('/exercises/:id/complete', requireAuth, requireRole('patient'), asyncHandler(completePatientExerciseController));

export default router;
