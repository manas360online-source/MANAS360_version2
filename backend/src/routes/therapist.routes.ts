import { Router } from 'express';
import {
	createTherapistProfileController,
	getMyTherapistProfileController,
	uploadMyTherapistDocumentController,
} from '../controllers/therapist.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTherapistRole } from '../middleware/rbac.middleware';
import {
	asyncHandler,
	uploadTherapistDocumentMiddleware,
	validateCreateTherapistProfileRequest,
	validateSessionIdParam,
	validateTherapistEarningsQuery,
	validateTherapistLeadsQuery,
	validateTherapistSessionNoteRequest,
	validateTherapistSessionHistoryQuery,
	validateUpdateTherapistSessionStatusRequest,
	validateUploadTherapistDocumentRequest,
} from '../middleware/validate.middleware';
import {
	getMyTherapistLeadsController,
	purchaseMyTherapistLeadController,
} from '../controllers/lead.controller';
import {
	rescheduleSessionController,
	cancelSessionController,
	sendReminderController,
	startLiveSessionController,
	duplicateTemplateController,
} from '../controllers/therapist.actions.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { requireSessionOwnership } from '../middleware/ownership.middleware';
import {
	getMyTherapistSessionsController,
    getMyTherapistSessionController,
	getMyTherapistEarningsController,
	patchMyTherapistSessionController,
	postMyTherapistSessionNoteController,
	exportMyTherapistSessionController,
	postMyTherapistResponseNoteController,
	listMyTherapistResponseNotesController,
	getMyTherapistResponseNoteController,
	putMyTherapistResponseNoteController,
	deleteMyTherapistResponseNoteController,
} from '../controllers/session.controller';
import { exportRateLimiter } from '../middleware/exportRateLimiter.middleware';

const router = Router();

router.post('/profile', requireAuth, requireTherapistRole, ...validateCreateTherapistProfileRequest, asyncHandler(createTherapistProfileController));
router.get('/me/profile', requireAuth, requireTherapistRole, asyncHandler(getMyTherapistProfileController));
router.get('/me/leads', requireAuth, requireTherapistRole, ...validateTherapistLeadsQuery, asyncHandler(getMyTherapistLeadsController));
router.post('/me/leads/:id/purchase', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(purchaseMyTherapistLeadController));
router.get('/me/earnings', requireAuth, requireTherapistRole, ...validateTherapistEarningsQuery, asyncHandler(getMyTherapistEarningsController));
router.get('/me/sessions', requireAuth, requireTherapistRole, ...validateTherapistSessionHistoryQuery, asyncHandler(getMyTherapistSessionsController));
router.get('/me/sessions/:id', requireAuth, requireTherapistRole, ...validateSessionIdParam, requireSessionOwnership, asyncHandler(getMyTherapistSessionController));
router.get('/me/sessions/:id/export', requireAuth, requireTherapistRole, ...validateSessionIdParam, requireSessionOwnership, exportRateLimiter, asyncHandler(exportMyTherapistSessionController));
router.post('/me/sessions/:id/actions/reschedule', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(rescheduleSessionController));
router.post('/me/sessions/:id/actions/cancel', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(cancelSessionController));
router.post('/me/sessions/:id/actions/remind', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(sendReminderController));
router.post('/me/sessions/:id/actions/start-live', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(startLiveSessionController));
// Analytics
router.get('/me/analytics/summary', requireAuth, requireTherapistRole, asyncHandler(analyticsController.getSummary.bind(analyticsController)));
router.get('/me/analytics/sessions', requireAuth, requireTherapistRole, asyncHandler(analyticsController.getTimeSeries.bind(analyticsController)));
router.get('/me/analytics/dropoff', requireAuth, requireTherapistRole, asyncHandler(analyticsController.getDropOff.bind(analyticsController)));
router.patch('/me/sessions/:id', requireAuth, requireTherapistRole, ...validateSessionIdParam, ...validateUpdateTherapistSessionStatusRequest, asyncHandler(patchMyTherapistSessionController));
router.post('/me/sessions/:id/notes', requireAuth, requireTherapistRole, ...validateSessionIdParam, ...validateTherapistSessionNoteRequest, asyncHandler(postMyTherapistSessionNoteController));
router.post('/me/sessions/:id/responses/:responseId/notes', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(postMyTherapistResponseNoteController));
router.get('/me/sessions/:id/responses/:responseId/notes', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(listMyTherapistResponseNotesController));
router.get('/me/sessions/:id/responses/:responseId/notes/:noteId', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(getMyTherapistResponseNoteController));
router.put('/me/sessions/:id/responses/:responseId/notes/:noteId', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(putMyTherapistResponseNoteController));
router.delete('/me/sessions/:id/responses/:responseId/notes/:noteId', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(deleteMyTherapistResponseNoteController));
router.post(
	'/me/documents',
	requireAuth,
	requireTherapistRole,
	uploadTherapistDocumentMiddleware,
	...validateUploadTherapistDocumentRequest,
	asyncHandler(uploadMyTherapistDocumentController),
);

// Template actions
router.post('/me/templates/:id/actions/duplicate', requireAuth, requireTherapistRole, asyncHandler(duplicateTemplateController));

export default router;
