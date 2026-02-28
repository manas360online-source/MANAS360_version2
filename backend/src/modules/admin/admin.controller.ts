import { Request, Response, NextFunction } from 'express';
import { PrismaClient, PayoutStatus, VerificationStatus } from '@prisma/client';
import { WalletService } from '../wallet/wallet.service';
import { HTTP_STATUS } from '../../utils/constants';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();
const walletService = new WalletService();

export class AdminController {
  /**
   * Get payout requests
   */
  async getPayoutRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as PayoutStatus | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [payouts, total] = await Promise.all([
        prisma.payoutRequest.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.payoutRequest.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          payouts,
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
   * Approve payout
   */
  async approvePayout(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { transactionReference } = req.body;
      const adminId = req.user!.id;

      const payout = await walletService.approvePayout(adminId, id, transactionReference);

      logger.info('Payout approved by admin', {
        payoutId: id,
        adminId,
        amount: payout.amount,
      });

      res.json({
        success: true,
        data: { payout },
        message: 'Payout approved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject payout
   */
  async rejectPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.id;

      const payout = await walletService.rejectPayout(adminId, id, reason);

      logger.info('Payout rejected by admin', {
        payoutId: id,
        adminId,
        reason,
      });

      res.json({
        success: true,
        data: { payout },
        message: 'Payout rejected',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(req: Request, res: Response, next: NextFunction) {
    try {
      const [totalUsers, totalProviders, totalSessions, totalRevenue, pendingPayouts] =
        await Promise.all([
          prisma.user.count(),
          prisma.providerProfile.count(),
          prisma.session.count(),
          prisma.payment.aggregate({
            where: { status: 'CAPTURED' },
            _sum: { amount: true },
          }),
          prisma.payoutRequest.aggregate({
            where: { status: PayoutStatus.REQUESTED },
            _sum: { amount: true },
            _count: true,
          }),
        ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          totalProviders,
          totalSessions,
          totalRevenue: totalRevenue._sum.amount || 0,
          pendingPayouts: {
            count: pendingPayouts._count,
            amount: pendingPayouts._sum.amount || 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all providers
   */
  async getProviders(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as VerificationStatus | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const where: any = {};
      if (status) {
        where.verificationStatus = status;
      }

      const [providers, total] = await Promise.all([
        prisma.providerProfile.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.providerProfile.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          providers,
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
   * Verify provider
   */
  async verifyProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;

      const provider = await prisma.providerProfile.update({
        where: { userId: id },
        data: {
          verificationStatus: VerificationStatus.VERIFIED,
          licenseVerified: true,
          verificationDate: new Date(),
          verificationNotes: `Verified by admin ${adminId}`,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'VERIFY_PROVIDER',
          entityType: 'provider_profile',
          entityId: provider.id,
          changes: {
            providerId: id,
            verificationStatus: 'VERIFIED',
          },
        },
      });

      logger.info('Provider verified by admin', {
        providerId: id,
        adminId,
      });

      res.json({
        success: true,
        data: { provider },
        message: 'Provider verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all sessions
   */
  async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
          where,
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            provider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.session.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          sessions,
          total,
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
