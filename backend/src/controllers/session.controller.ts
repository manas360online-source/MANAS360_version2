import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	bookPatientSession,
	getMyTherapistEarnings,
	getMySessionHistory,
	getMyTherapistSessions,
	getMyTherapistSessionDetail,
	saveMyTherapistSessionNote,
	updateMyTherapistSessionStatus,
} from '../services/session.service';
import {
  addResponseNote,
  listResponseNotes,
  getResponseNoteDecrypted,
  updateResponseNote,
  deleteResponseNote,
} from '../services/session.service';
import { sessionExportService } from '../services/session-export.service';
import { prisma } from '../config/db';
import { exportQueue } from '../jobs/export.worker';

const getAuthUserId = (req: Request): string => {
	const userId = req.auth?.userId;

	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	return userId;
};

export const bookMySessionController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.validatedBookSessionPayload) {
		throw new AppError('Invalid booking payload', 400);
	}

	const session = await bookPatientSession(userId, req.validatedBookSessionPayload);

	sendSuccess(res, session, 'Session booked successfully', 201);
};

export const getMySessionHistoryController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const query = req.validatedPatientSessionHistoryQuery ?? { page: 1, limit: 10 };

	const history = await getMySessionHistory(userId, query);

	sendSuccess(res, history, 'Session history fetched');
};

export const getMyTherapistSessionsController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const query = req.validatedTherapistSessionHistoryQuery ?? { page: 1, limit: 10 };

	const sessions = await getMyTherapistSessions(userId, query);

	sendSuccess(res, sessions, 'Therapist sessions fetched');
};

export const patchMyTherapistSessionController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.validatedTherapistSessionStatusPayload) {
		throw new AppError('Invalid session status payload', 400);
	}

	const updatedSession = await updateMyTherapistSessionStatus(
		userId,
		String(req.params.id),
		req.validatedTherapistSessionStatusPayload,
	);

	sendSuccess(res, updatedSession, 'Therapist session updated');
};

export const postMyTherapistSessionNoteController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.validatedTherapistSessionNotePayload) {
		throw new AppError('Invalid session note payload', 400);
	}

	const result = await saveMyTherapistSessionNote(
		userId,
		String(req.params.id),
		req.validatedTherapistSessionNotePayload,
	);

	sendSuccess(res, result, 'Session note saved');
};

export const postMyTherapistResponseNoteController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const { content } = req.body || {};
	if (!content || typeof content !== 'string' || !content.trim()) throw new AppError('Invalid note content', 400);

	const result = await addResponseNote(userId, String(req.params.id), String(req.params.responseId), content.trim());
	sendSuccess(res, result, 'Response note added', 201);
};

export const listMyTherapistResponseNotesController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const notes = await listResponseNotes(userId, String(req.params.id), String(req.params.responseId));
	sendSuccess(res, { notes }, 'Response notes fetched');
};

export const getMyTherapistResponseNoteController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const content = await getResponseNoteDecrypted(userId, String(req.params.noteId));
	sendSuccess(res, { note: { id: req.params.noteId, content } }, 'Response note fetched');
};

export const putMyTherapistResponseNoteController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const { content } = req.body || {};
	if (!content || typeof content !== 'string' || !content.trim()) throw new AppError('Invalid note content', 400);

	const result = await updateResponseNote(userId, String(req.params.noteId), content.trim());
	sendSuccess(res, result, 'Response note updated');
};

export const deleteMyTherapistResponseNoteController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const result = await deleteResponseNote(userId, String(req.params.noteId));
	sendSuccess(res, result, 'Response note deleted');
};

export const getMyTherapistEarningsController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const query = req.validatedTherapistEarningsQuery ?? { page: 1, limit: 10 };

	const earnings = await getMyTherapistEarnings(userId, query);

	sendSuccess(res, earnings, 'Therapist earnings fetched');
};

export const getMyTherapistSessionController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const sessionId = String(req.params.id);

	const detail = await getMyTherapistSessionDetail(userId, sessionId);

	sendSuccess(res, detail, 'Therapist session detail fetched');
};

export const exportMyTherapistSessionController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const sessionId = String(req.params.id);
	const format = String(req.query.format || 'csv').toLowerCase();

	try {
		// log export request for audit (best-effort)
		try {
			await prisma.exportLog.create({ data: { therapistId: userId, sessionId, exportType: format.toUpperCase(), ipAddress: req.ip, userAgent: req.headers['user-agent'] as string | undefined } });
		} catch (e) {
			console.warn('Failed to write export log', e);
		}

		// Enqueue background export job
		const job = await exportQueue.add('export', { sessionId, format, requestorId: userId, uploadToS3: true }, { removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 } });

		// create a pending session export record mapped to the jobId (best-effort)
		try {
			await prisma.sessionExport.create({ data: { sessionId, jobId: String(job.id), format: format.toUpperCase(), fileName: '', filePath: '', status: 'PENDING' } });
		} catch (e) {
			console.warn('Failed to create sessionExport record for job', job.id, e);
		}

		res.status(202).json({ success: true, jobId: job.id, status: 'queued' });
	} catch (err) {
		res.status(500).json({ success: false, error: (err as Error).message });
	}
};
