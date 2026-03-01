import { Router } from 'express';
import { ProviderController } from './provider.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { updateProfileSchema, setAvailabilitySchema } from './provider.validation';

const router = Router();
const providerController = new ProviderController();

/**
 * Public routes
 */

/**
 * GET /providers
 * Get all verified providers (public)
 */
router.get('/', providerController.getProviders);

/**
 * GET /providers/:id
 * Get provider details (public)
 */
router.get('/:id', providerController.getProviderById);

/**
 * Protected routes
 */
router.use(authenticate);

/**
 * GET /providers/me/profile
 * Get own provider profile
 */
router.get(
  '/me/profile',
  requireRole('THERAPIST', 'PSYCHIATRIST', 'COACH'),
  providerController.getMyProfile
);

/**
 * PUT /providers/me/profile
 * Update provider profile
 */
router.put(
  '/me/profile',
  requireRole('THERAPIST', 'PSYCHIATRIST', 'COACH'),
  validateRequest(updateProfileSchema),
  providerController.updateProfile
);

/**
 * GET /providers/me/availability
 * Get provider availability
 */
router.get(
  '/me/availability',
  requireRole('THERAPIST', 'PSYCHIATRIST', 'COACH'),
  providerController.getAvailability
);

/**
 * POST /providers/me/availability
 * Set provider availability
 */
router.post(
  '/me/availability',
  requireRole('THERAPIST', 'PSYCHIATRIST', 'COACH'),
  validateRequest(setAvailabilitySchema),
  providerController.setAvailability
);

/**
 * GET /providers/me/sessions
 * Get provider's sessions
 */
router.get(
  '/me/sessions',
  requireRole('THERAPIST', 'PSYCHIATRIST', 'COACH'),
  providerController.getMySessions
);

export default router;
