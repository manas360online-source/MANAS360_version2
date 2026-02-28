import { Router } from 'express';
import { SessionController } from './session.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole, requireOwnerOrAdmin } from '../../middleware/rbac.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createSessionSchema, completeSessionSchema } from './session.validation';
import { userRateLimit } from '../../middleware/rateLimit.middleware';

const router = Router();
const sessionController = new SessionController();

// All routes require authentication
router.use(authenticate);

/**
 * POST /sessions
 * Create new session (Patient only)
 */
router.post(
  '/',
  requireRole('PATIENT'),
  userRateLimit(10, 60000), // 10 bookings per minute
  validateRequest(createSessionSchema),
  sessionController.createSession
);

/**
 * GET /sessions
 * Get user's sessions
 */
router.get('/', sessionController.getUserSessions);

/**
 * GET /sessions/:id
 * Get session details
 */
router.get('/:id', sessionController.getSession);

/**
 * POST /sessions/:id/start
 * Start session (Provider or Patient)
 */
router.post('/:id/start', sessionController.startSession);

/**
 * POST /sessions/:id/complete
 * Complete session (Provider only)
 */
router.post(
  '/:id/complete',
  requireRole('THERAPIST', 'PSYCHIATRIST', 'COACH'),
  validateRequest(completeSessionSchema),
  sessionController.completeSession
);

/**
 * POST /sessions/:id/no-show
 * Mark session as no-show
 */
router.post('/:id/no-show', sessionController.markNoShow);

export default router;
