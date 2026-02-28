import { PrismaClient, PayoutStatus } from '@prisma/client';
import { AppError } from '../../middleware/error.middleware';
import { ERROR_CODES, HTTP_STATUS } from '../../utils/constants';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

const prisma = new PrismaClient();

export class WalletService {
  /**
   * Add funds to pending balance
   * Called when payment is captured
   * 
   * CRITICAL: Uses transaction with row-level locking
   */
  async addPendingBalance(providerId: string, amount: number, metadata?: any) {
    return await prisma.$transaction(async (tx) => {
      // Get or create wallet with SELECT FOR UPDATE (row lock)
      let wallet = await tx.providerWallet.findUnique({
        where: { providerId },
      });

      if (!wallet) {
        wallet = await tx.providerWallet.create({
          data: {
            providerId,
            availableBalance: 0,
            pendingBalance: 0,
            lifetimeEarnings: 0,
            totalWithdrawn: 0,
          },
        });
      }

      // Lock wallet row for update
      const lockedWallet = await tx.$queryRaw<any[]>`
        SELECT * FROM provider_wallets 
        WHERE provider_id = ${providerId}
        FOR UPDATE
      `;

      if (!lockedWallet || lockedWallet.length === 0) {
        throw new AppError('Wallet not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      const balanceBefore = wallet.pendingBalance;
      const balanceAfter = balanceBefore + amount;

      // Update wallet
      const updatedWallet = await tx.providerWallet.update({
        where: { providerId },
        data: {
          pendingBalance: balanceAfter,
          lifetimeEarnings: { increment: amount },
        },
      });

      // Record transaction
      await tx.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          userId: providerId,
          type: 'CREDIT',
          amount,
          balanceBefore,
          balanceAfter,
          description: 'Session payment received (pending)',
          referenceType: metadata?.referenceType || 'session',
          referenceId: metadata?.referenceId,
          metadata,
        },
      });

      logger.info('Added pending balance', {
        providerId,
        amount,
        balanceAfter,
      });

      return updatedWallet;
    });
  }

  /**
   * Release pending balance to available balance
   * Called when session is completed
   * 
   * CRITICAL: Uses transaction with row-level locking
   */
  async releasePendingBalance(providerId: string, amount: number, metadata?: any) {
    return await prisma.$transaction(async (tx) => {
      // Lock wallet
      const wallet = await tx.providerWallet.findUnique({
        where: { providerId },
      });

      if (!wallet) {
        throw new AppError('Wallet not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Lock row
      await tx.$queryRaw`
        SELECT * FROM provider_wallets 
        WHERE provider_id = ${providerId}
        FOR UPDATE
      `;

      // Check sufficient pending balance
      if (wallet.pendingBalance < amount) {
        throw new AppError(
          'Insufficient pending balance',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INSUFFICIENT_BALANCE
        );
      }

      const pendingBefore = wallet.pendingBalance;
      const availableBefore = wallet.availableBalance;

      // Update wallet
      const updatedWallet = await tx.providerWallet.update({
        where: { providerId },
        data: {
          pendingBalance: { decrement: amount },
          availableBalance: { increment: amount },
        },
      });

      // Record transaction
      await tx.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          userId: providerId,
          type: 'CREDIT',
          amount,
          balanceBefore: availableBefore,
          balanceAfter: updatedWallet.availableBalance,
          description: 'Session completed - balance released',
          referenceType: metadata?.referenceType || 'session',
          referenceId: metadata?.referenceId,
          metadata: {
            ...metadata,
            pendingBefore,
            pendingAfter: updatedWallet.pendingBalance,
          },
        },
      });

      logger.info('Released pending balance', {
        providerId,
        amount,
        availableBalance: updatedWallet.availableBalance,
      });

      return updatedWallet;
    });
  }

  /**
   * Request payout
   * Provider initiates withdrawal
   */
  async requestPayout(providerId: string, amount: number) {
    // Validate minimum amount
    if (amount < env.MIN_PAYOUT_AMOUNT) {
      throw new AppError(
        `Minimum payout amount is ₹${env.MIN_PAYOUT_AMOUNT / 100}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.PAYOUT_BELOW_MINIMUM
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Lock wallet
      const wallet = await tx.providerWallet.findUnique({
        where: { providerId },
      });

      if (!wallet) {
        throw new AppError('Wallet not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      await tx.$queryRaw`
        SELECT * FROM provider_wallets 
        WHERE provider_id = ${providerId}
        FOR UPDATE
      `;

      // Check sufficient balance
      if (wallet.availableBalance < amount) {
        throw new AppError(
          'Insufficient available balance',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INSUFFICIENT_BALANCE
        );
      }

      // Create payout request
      const payoutRequest = await tx.payoutRequest.create({
        data: {
          walletId: wallet.id,
          userId: providerId,
          amount,
          status: PayoutStatus.REQUESTED,
        },
      });

      logger.info('Payout requested', {
        providerId,
        amount,
        payoutRequestId: payoutRequest.id,
      });

      return payoutRequest;
    });
  }

  /**
   * Approve payout (Admin only)
   * 
   * CRITICAL: Uses transaction with row-level locking
   */
  async approvePayout(adminId: string, payoutRequestId: string, transactionReference?: string) {
    return await prisma.$transaction(async (tx) => {
      // Lock payout request
      const payoutRequest = await tx.payoutRequest.findUnique({
        where: { id: payoutRequestId },
        include: { wallet: true },
      });

      if (!payoutRequest) {
        throw new AppError('Payout request not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Check status
      if (payoutRequest.status !== PayoutStatus.REQUESTED) {
        throw new AppError(
          'Payout already processed',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.PAYOUT_ALREADY_PROCESSED
        );
      }

      // Lock wallet
      await tx.$queryRaw`
        SELECT * FROM provider_wallets 
        WHERE id = ${payoutRequest.walletId}
        FOR UPDATE
      `;

      const wallet = payoutRequest.wallet;

      // Check sufficient balance
      if (wallet.availableBalance < payoutRequest.amount) {
        throw new AppError(
          'Insufficient available balance',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INSUFFICIENT_BALANCE
        );
      }

      const balanceBefore = wallet.availableBalance;
      const processingFee = Math.floor(payoutRequest.amount * 0.02); // 2% processing fee
      const netAmount = payoutRequest.amount - processingFee;

      // Update wallet
      const updatedWallet = await tx.providerWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: payoutRequest.amount },
          totalWithdrawn: { increment: netAmount },
        },
      });

      // Update payout request
      const updatedPayout = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: PayoutStatus.APPROVED,
          approvedBy: adminId,
          approvedAt: new Date(),
          processingFee,
          netAmount,
          transactionReference,
        },
      });

      // Record wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: payoutRequest.userId,
          type: 'DEBIT',
          amount: payoutRequest.amount,
          balanceBefore,
          balanceAfter: updatedWallet.availableBalance,
          description: `Payout approved - ${transactionReference || 'manual transfer'}`,
          referenceType: 'payout',
          referenceId: payoutRequestId,
          metadata: {
            processingFee,
            netAmount,
            approvedBy: adminId,
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'APPROVE_PAYOUT',
          entityType: 'payout_request',
          entityId: payoutRequestId,
          changes: {
            amount: payoutRequest.amount,
            providerId: payoutRequest.userId,
            transactionReference,
          },
        },
      });

      logger.info('Payout approved', {
        payoutRequestId,
        providerId: payoutRequest.userId,
        amount: payoutRequest.amount,
        netAmount,
        approvedBy: adminId,
      });

      return updatedPayout;
    });
  }

  /**
   * Reject payout (Admin only)
   */
  async rejectPayout(adminId: string, payoutRequestId: string, reason: string) {
    const payoutRequest = await prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
    });

    if (!payoutRequest) {
      throw new AppError('Payout request not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (payoutRequest.status !== PayoutStatus.REQUESTED) {
      throw new AppError(
        'Payout already processed',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.PAYOUT_ALREADY_PROCESSED
      );
    }

    const updatedPayout = await prisma.payoutRequest.update({
      where: { id: payoutRequestId },
      data: {
        status: PayoutStatus.REJECTED,
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'REJECT_PAYOUT',
        entityType: 'payout_request',
        entityId: payoutRequestId,
        changes: {
          amount: payoutRequest.amount,
          providerId: payoutRequest.userId,
          reason,
        },
      },
    });

    logger.info('Payout rejected', {
      payoutRequestId,
      providerId: payoutRequest.userId,
      reason,
      rejectedBy: adminId,
    });

    return updatedPayout;
  }

  /**
   * Get wallet by provider ID
   */
  async getWallet(providerId: string) {
    const wallet = await prisma.providerWallet.findUnique({
      where: { providerId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      throw new AppError('Wallet not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    return wallet;
  }
}
