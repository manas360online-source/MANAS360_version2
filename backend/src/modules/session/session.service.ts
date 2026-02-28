import { PrismaClient, SessionStatus } from '@prisma/client';
import { razorpayService } from '../../services/razorpay.service';
import { WalletService } from '../wallet/wallet.service';
import { AppError } from '../../middleware/error.middleware';
import { ERROR_CODES, HTTP_STATUS } from '../../utils/constants';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

const prisma = new PrismaClient();
const walletService = new WalletService();

interface CreateSessionInput {
  patientId: string;
  providerId: string;
  scheduledAt: Date;
  duration?: number;
}

export class SessionService {
  /**
   * Create new session
   * Status: PENDING_PAYMENT
   * 
   * FLOW:
   * 1. Validate provider availability
   * 2. Check for booking conflicts
   * 3. Create session (pending payment)
   * 4. Create Razorpay order
   * 5. Return order details to frontend
   */
  async createSession(input: CreateSessionInput) {
    // Validate provider
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: input.providerId },
    });

    if (!provider) {
      throw new AppError('Provider not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (!provider.isAcceptingPatients) {
      throw new AppError(
        'Provider not accepting patients',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.PROVIDER_NOT_AVAILABLE
      );
    }

    // Check if slot is available (prevent double booking)
    const existingSession = await prisma.session.findFirst({
      where: {
        providerId: input.providerId,
        scheduledAt: input.scheduledAt,
        status: {
          in: [SessionStatus.CONFIRMED, SessionStatus.PENDING_PAYMENT, SessionStatus.LIVE],
        },
      },
    });

    if (existingSession) {
      throw new AppError(
        'Time slot already booked',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.SESSION_ALREADY_BOOKED
      );
    }

    // Create session and payment in transaction
    return await prisma.$transaction(async (tx) => {
      const duration = input.duration || 60;
      const sessionRate = provider.sessionRate;

      // Create session
      const session = await tx.session.create({
        data: {
          patientId: input.patientId,
          providerId: input.providerId,
          scheduledAt: input.scheduledAt,
          duration,
          status: SessionStatus.PENDING_PAYMENT,
          fee: sessionRate,
          platformCommission: Math.floor(sessionRate * (env.PLATFORM_COMMISSION_PERCENT / 100)),
          providerEarning: Math.floor(sessionRate * (env.THERAPIST_SHARE_PERCENT / 100)),
        },
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          userId: input.patientId,
          paymentType: 'SESSION',
          amount: sessionRate,
          status: 'CREATED',
          referenceType: 'session',
          referenceId: session.id,
          metadata: {
            sessionId: session.id,
            providerId: input.providerId,
            scheduledAt: input.scheduledAt,
          },
        },
      });

      // Create Razorpay order
      const razorpayOrder = await razorpayService.createOrder({
        amount: sessionRate,
        receipt: `session_${session.id}`,
        notes: {
          sessionId: session.id,
          patientId: input.patientId,
          providerId: input.providerId,
        },
      });

      // Update payment with Razorpay order ID
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          razorpayOrderId: razorpayOrder.id,
        },
      });

      logger.info('Session created', {
        sessionId: session.id,
        patientId: input.patientId,
        providerId: input.providerId,
        amount: sessionRate,
      });

      return {
        session,
        payment,
        razorpayOrder,
      };
    });
  }

  /**
   * Complete session
   * Called by provider after session ends
   * 
   * FLOW:
   * 1. Verify session exists and is LIVE
   * 2. Mark session as COMPLETED
   * 3. Release pending balance to available balance
   */
  async completeSession(sessionId: string, providerId: string, sessionNotes?: string) {
    return await prisma.$transaction(async (tx) => {
      // Get session with lock
      const session = await tx.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Verify provider
      if (session.providerId !== providerId) {
        throw new AppError('Not authorized', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
      }

      // Check status
      if (session.status !== SessionStatus.LIVE && session.status !== SessionStatus.CONFIRMED) {
        throw new AppError(
          'Session cannot be completed in current status',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Update session
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          endedAt: new Date(),
          sessionNotes,
        },
      });

      // Release pending balance to available
      await walletService.releasePendingBalance(providerId, session.providerEarning, {
        referenceType: 'session',
        referenceId: sessionId,
      });

      logger.info('Session completed', {
        sessionId,
        providerId,
        providerEarning: session.providerEarning,
      });

      return updatedSession;
    });
  }

  /**
   * Start session (mark as LIVE)
   */
  async startSession(sessionId: string, providerId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (session.providerId !== providerId && session.patientId !== providerId) {
      throw new AppError('Not authorized', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    if (session.status !== SessionStatus.CONFIRMED) {
      throw new AppError(
        'Session must be confirmed before starting',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.LIVE,
        startedAt: new Date(),
      },
    });

    logger.info('Session started', { sessionId, providerId });

    return updatedSession;
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string, userId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!session) {
      throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Check authorization
    if (session.patientId !== userId && session.providerId !== userId) {
      throw new AppError('Not authorized', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    return session;
  }

  /**
   * Get user's sessions
   */
  async getUserSessions(userId: string, userRole: string) {
    const where = userRole === 'PATIENT' ? { patientId: userId } : { providerId: userId };

    const sessions = await prisma.session.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });

    return sessions;
  }

  /**
   * Mark session as no-show
   */
  async markNoShow(sessionId: string, markedBy: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Only provider or patient can mark no-show
    const isAuthorized = session.patientId === markedBy || session.providerId === markedBy;
    if (!isAuthorized) {
      throw new AppError('Not authorized', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    const who = session.patientId === markedBy ? 'patient' : 'provider';

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.NO_SHOW,
        noShowMarkedBy: who,
        noShowMarkedAt: new Date(),
      },
    });

    logger.info('Session marked as no-show', {
      sessionId,
      markedBy: who,
    });

    // TODO: Handle refund/payout logic based on no-show policy

    return updatedSession;
  }
}
