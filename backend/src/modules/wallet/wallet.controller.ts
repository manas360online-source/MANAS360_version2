import { Request, Response, NextFunction } from 'express';
import { WalletService } from './wallet.service';
import { HTTP_STATUS } from '../../utils/constants';
import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';

const walletService = new WalletService();
const prisma = new PrismaClient();

export class WalletController {
  /**
   * Get wallet details
   */
  async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.id;

      const wallet = await walletService.getWallet(providerId);

      res.json({
        success: true,
        data: { wallet },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request payout
   */
  async requestPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.id;
      const { amount } = req.body;

      const payoutRequest = await walletService.requestPayout(providerId, amount);

      logger.info('Payout requested', {
        providerId,
        amount,
        payoutRequestId: payoutRequest.id,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: { payoutRequest },
        message: 'Payout request submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet transactions
   */
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const wallet = await prisma.providerWallet.findUnique({
        where: { providerId },
      });

      if (!wallet) {
        return res.json({
          success: true,
          data: { transactions: [], total: 0 },
        });
      }

      const [transactions, total] = await Promise.all([
        prisma.walletTransaction.findMany({
          where: { walletId: wallet.id },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.walletTransaction.count({
          where: { walletId: wallet.id },
        }),
      ]);

      res.json({
        success: true,
        data: {
          transactions,
          total,
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payout requests
   */
  async getPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.id;
      const status = req.query.status as string;

      const where: any = { userId: providerId };
      if (status) {
        where.status = status;
      }

      const payouts = await prisma.payoutRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json({
        success: true,
        data: { payouts },
      });
    } catch (error) {
      next(error);
    }
  }
}
