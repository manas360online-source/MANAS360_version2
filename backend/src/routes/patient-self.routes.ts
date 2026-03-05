import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/validate.middleware';
import {
  cancelPatientSubscriptionController,
  completePatientExerciseController,
  createMoodController,
  downloadPatientInvoiceController,
  downgradePatientSubscriptionController,
  getPatientDashboardController,
  getPatientExercisesController,
  getPatientInvoicesController,
  getPatientMoodController,
  getPatientMoodStatsController,
  getPatientMoodTodayController,
  getPatientPaymentMethodController,
  getPatientProgressController,
  getPatientSettingsController,
  getPatientSupportCenterController,
  getPatientSubscriptionController,
  reactivatePatientSubscriptionController,
  createPatientSupportTicketController,
  togglePatientSubscriptionAutoRenewController,
  updatePatientSettingsController,
  updatePatientPaymentMethodController,
  upgradePatientSubscriptionController,
} from '../controllers/patient-v1.controller';

const router = Router();

router.get('/dashboard', requireAuth, requireRole('patient'), asyncHandler(getPatientDashboardController));

router.get('/settings', requireAuth, requireRole('patient'), asyncHandler(getPatientSettingsController));
router.put('/settings', requireAuth, requireRole('patient'), asyncHandler(updatePatientSettingsController));

router.get('/support', requireAuth, requireRole('patient'), asyncHandler(getPatientSupportCenterController));
router.post('/support/tickets', requireAuth, requireRole('patient'), asyncHandler(createPatientSupportTicketController));

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
router.post('/mood', requireAuth, requireRole('patient'), asyncHandler(createMoodController));
router.get('/mood/today', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodTodayController));
router.get('/mood/history', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodController));
router.get('/mood/stats', requireAuth, requireRole('patient'), asyncHandler(getPatientMoodStatsController));

router.get('/progress', requireAuth, requireRole('patient'), asyncHandler(getPatientProgressController));

router.get('/exercises', requireAuth, requireRole('patient'), asyncHandler(getPatientExercisesController));
router.patch('/exercises/:id/complete', requireAuth, requireRole('patient'), asyncHandler(completePatientExerciseController));

export default router;
