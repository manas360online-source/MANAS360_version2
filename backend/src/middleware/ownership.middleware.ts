import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from './error.middleware';

/**
 * Ensure the authenticated therapist owns the session identified by req.params.id
 * Uses Prisma therapy_sessions ownership by therapist user id.
 */
export const requireSessionOwnership = async (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.auth?.userId;
  const sessionId = String(req.params.id || '');
  if (!userId) return next(new AppError('Authentication required', 401));
  if (!sessionId) return next(new AppError('Session id required', 400));

  try {
    const session = await prisma.therapySession.findFirst({
      where: { id: sessionId },
      select: { id: true, therapistProfileId: true },
    });

    if (!session) {
      return next(new AppError('Session not found', 404));
    }

    if (String(session.therapistProfileId) !== userId) {
      try {
        await prisma.sessionAuditLog.create({
          data: {
            sessionId,
            userId,
            action: 'UNAUTHORIZED_ACCESS',
            entityType: 'THERAPY_SESSION',
            entityId: sessionId,
            changes: { reason: 'ownership_mismatch' },
          } as any,
        });
      } catch (e) {
        // best effort
      }
      return next(new AppError('Forbidden', 403));
    }

    return next();
  } catch (e) {
    return next(new AppError('Session ownership check failed', 500));
  }
};
