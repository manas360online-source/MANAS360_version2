import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { requestPayoutSchema } from './wallet.validation';
import { userRateLimit } from '../../middleware/rateLimit.middleware';

const router = Router();
const walletController = new WalletController();

// All routes require authentication
router.use(authenticate);

/**
 * GET /wallet
 * Get provider's wallet details
 */
router.get(
  '/',
  requireRole('THERAPIST', 'PSYCHIATRIST', 'COACH'),
  walletController.getWallet
);

/**
 * POST /wallet/payout
 * Request payout
 */
router.post(
  '/payout',
  requireRole('THERAPIST', 'PSYCHIATRIST', 'COACH'),
  userRateLimit(5, 3600000), // 5 payout requests per hour
  validateRequest(requestPayoutSchema),
  walletController.requestPayout
);

/**
 * GET /wallet/transactions
 * Get wallet transactions
 */
router.get(
  '/transactions',
  requireRole('THERAPIST', 'PSYCHIATRIST', 'COACH'),
  walletController.getTransactions
);

/**
 * GET /wallet/payouts
 * Get payout requests
 */
router.get(
  '/payouts',
  requireRole('THERAPIST', 'PSYCHIATRIST', 'COACH'),
  walletController.getPayouts
);

export default router;
