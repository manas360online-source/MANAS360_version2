import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { publishPlaceholderNotificationEvent } from './notification.service';
import { cbtSessionService } from './cbt-session.service';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import cuid from 'cuid';

export class SessionActionsService {
  async ensureOwnership(therapistId: string, sessionId: string) {
    const session = await prisma.patientSession.findUnique({ where: { id: sessionId }, include: { template: true } });
    if (!session) throw new AppError('Session not found', 404);
    if (!session.template || String(session.template.therapistId) !== String(therapistId)) throw new AppError('Forbidden', 403);
    return session;
  }

  async rescheduleSession(therapistId: string, sessionId: string, newStartAt: string, options: { requestorId?: string } = {}) {
    const session = await this.ensureOwnership(therapistId, sessionId);

    const before = { startAt: session.startedAt, status: session.status } as any;

    const updated = await prisma.patientSession.update({ where: { id: sessionId }, data: { startedAt: new Date(newStartAt) } });

    await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId || therapistId, action: 'RESCHEDULE', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { before, after: { startAt: updated.startedAt } } } as any });

    return updated;
  }

  async cancelSession(therapistId: string, sessionId: string, reason?: string, options: { requestorId?: string } = {}) {
    const session = await this.ensureOwnership(therapistId, sessionId);

    const before = { status: session.status, cancelledAt: session.cancelledAt } as any;

    const updated = await prisma.patientSession.update({ where: { id: sessionId }, data: { status: 'CANCELLED', cancelledAt: new Date() } });

    await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId || therapistId, action: 'CANCEL', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { reason, before, after: { status: updated.status, cancelledAt: updated.cancelledAt } } } as any });

    return updated;
  }

  async sendReminder(therapistId: string, sessionId: string, via: 'email' | 'sms' | 'both' = 'email', templateId?: string, options: { requestorId?: string } = {}) {
    await this.ensureOwnership(therapistId, sessionId);

    // enqueue placeholder notification
    const ev = await publishPlaceholderNotificationEvent({ eventType: 'REMINDER', entityType: 'PATIENT_SESSION', entityId: sessionId, payload: { via, templateId } });

    await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId || therapistId, action: 'REMIND', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { queued: true, event: ev } } } as any);

    return { queued: true };
  }

  async startLiveSession(therapistId: string, sessionId: string, mode: 'video' | 'call' = 'video', options: { requestorId?: string } = {}) {
    await this.ensureOwnership(therapistId, sessionId);

    const roomId = cuid();
    const expiresIn = '5m';
    const token = jwt.sign({ sessionId, therapistId, roomId, mode }, env.jwtAccessSecret, { expiresIn });
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId || therapistId, action: 'START_LIVE', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { roomId, mode, expiresAt } } } as any);

    return { room: { roomId, token, expiresAt } };
  }

  async duplicateTemplate(therapistId: string, templateId: string, opts: { publish?: boolean; title?: string } = {}, options: { requestorId?: string } = {}) {
    // ensure therapist owns the template
    const tpl = await prisma.cBTSessionTemplate.findUnique({ where: { id: templateId } });
    if (!tpl) throw new AppError('Template not found', 404);
    if (String(tpl.therapistId) !== String(therapistId)) throw new AppError('Forbidden', 403);

    const newTpl = await cbtSessionService.cloneTemplate(templateId, therapistId, { makePrivate: false, title: opts.title });

    await prisma.sessionAuditLog.create({ data: { userId: options.requestorId || therapistId, action: 'DUPLICATE', entityType: 'SESSION_TEMPLATE', entityId: templateId, changes: { newTemplateId: newTpl.id } } } as any);

    return newTpl;
  }
}

export const sessionActionsService = new SessionActionsService();
