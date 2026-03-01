import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTherapistRole } from '../middleware/rbac.middleware';
import {
	asyncHandler,
	validateSessionIdParam,
	validateTherapistLeadsQuery,
} from '../middleware/validate.middleware';
import {
	confirmMyTherapistLeadPurchaseController,
	getMyTherapistLeadsController,
	initiateMyTherapistLeadPurchaseController,
	purchaseMyTherapistLeadController,
} from '../controllers/lead.controller';

const router = Router();

router.get('/me', requireAuth, requireTherapistRole, ...validateTherapistLeadsQuery, asyncHandler(getMyTherapistLeadsController));
router.post('/:id/purchase/initiate', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(initiateMyTherapistLeadPurchaseController));
router.post('/:id/purchase/confirm', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(confirmMyTherapistLeadPurchaseController));
router.post('/:id/purchase', requireAuth, requireTherapistRole, ...validateSessionIdParam, asyncHandler(purchaseMyTherapistLeadController));

export default router;
