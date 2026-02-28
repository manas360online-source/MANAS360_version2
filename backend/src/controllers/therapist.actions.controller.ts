import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { sessionActionsService } from '../services/session.actions.service';

const getAuthUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError('Authentication required', 401);
  return userId;
};

export const rescheduleSessionController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const sessionId = String(req.params.id);
  const { newStartAt } = req.body || {};
  if (!newStartAt) throw new AppError('newStartAt required', 400);

  const updated = await sessionActionsService.rescheduleSession(userId, sessionId, newStartAt, { requestorId: userId });
  sendSuccess(res, updated, 'Session rescheduled');
};

export const cancelSessionController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const sessionId = String(req.params.id);
  const { reason } = req.body || {};

  const updated = await sessionActionsService.cancelSession(userId, sessionId, reason, { requestorId: userId });
  sendSuccess(res, updated, 'Session cancelled');
};

export const sendReminderController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const sessionId = String(req.params.id);
  const via = String(req.body?.via || 'email') as 'email' | 'sms' | 'both';

  const result = await sessionActionsService.sendReminder(userId, sessionId, via, String(req.body?.templateId || ''), { requestorId: userId });
  sendSuccess(res, result, 'Reminder queued');
};

export const startLiveSessionController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const sessionId = String(req.params.id);
  const mode = String(req.body?.mode || 'video') as 'video' | 'call';

  const result = await sessionActionsService.startLiveSession(userId, sessionId, mode, { requestorId: userId });
  sendSuccess(res, result, 'Live session started');
};

export const duplicateTemplateController = async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const templateId = String(req.params.id);
  const opts = { title: String(req.body?.title || '') };

  const result = await sessionActionsService.duplicateTemplate(userId, templateId, opts, { requestorId: userId });
  sendSuccess(res, result, 'Template duplicated', 201);
};

export const therapistActionsController = {
  rescheduleSessionController,
  cancelSessionController,
  sendReminderController,
  startLiveSessionController,
  duplicateTemplateController,
};
