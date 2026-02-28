import type { Request, Response, NextFunction } from 'express';
import TherapistProfileModel from '../models/therapist.model';
import TherapySessionModel from '../models/therapy-session.model';
import { prisma } from '../config/db';
import { AppError } from './error.middleware';

/**
 * Ensure the authenticated therapist owns the session identified by req.params.id
 * Works with existing mongoose sessions and falls back to Prisma patient_sessions where available.
 */
export const requireSessionOwnership = async (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.auth?.userId;
  const sessionId = String(req.params.id || '');
  if (!userId) return next(new AppError('Authentication required', 401));
  if (!sessionId) return next(new AppError('Session id required', 400));

  // Try mongoose-based session first
  try {
    const therapistProfile = await TherapistProfileModel.findOne({ userId }).select('_id').lean();
    if (therapistProfile) {
      const session = await prisma.therapySession.findFirst({ where: { id: sessionId, therapistProfileId: String(therapistProfile._id) }, select: { id: true } });
      if (session) return next();
    }
  } catch (e) {
    // ignore and fallback to prisma
  }

  // Fallback: Prisma patient_sessions table
  try {
    if (prisma && typeof prisma.patientSession?.findUnique === 'function') {
      const s = await prisma.patientSession.findUnique({ where: { id: sessionId }, select: { therapistId: true } as any });
      if (!s) return next(new AppError('Session not found', 404));
      if (s.therapistId !== userId) {
        try {
          await prisma.sessionAuditLog.create({ data: { sessionId, userId, action: 'UNAUTHORIZED_ACCESS', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { reason: 'ownership_mismatch' } } as any });
        } catch (e) {
          // best effort
        }
        return next(new AppError('Forbidden', 403));
      }
      return next();
    }
  } catch (e) {
    // ignore
  }

  return next(new AppError('Session not found or access denied', 404));
};
