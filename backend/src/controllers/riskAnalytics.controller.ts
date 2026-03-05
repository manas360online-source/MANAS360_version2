import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	acknowledgeEscalationById,
	getCurrentRisk,
	getMoodAccuracy,
	getMoodHistory,
	getMoodPrediction,
	getOpenEscalations,
	getRiskHistory,
	resolveEscalationById,
} from '../services/riskAnalytics.service';

const canAccessUserData = (req: Request, userId: string): boolean => {
	const role = String(req.auth?.role || '').toLowerCase();
	const authUserId = String(req.auth?.userId || '');
	if (['admin', 'superadmin', 'therapist', 'psychiatrist', 'coach'].includes(role)) return true;
	return role === 'patient' && authUserId === userId;
};

const assertUserScope = (req: Request, userId: string): void => {
	if (!canAccessUserData(req, userId)) {
		throw new AppError('Access denied for requested user data', 403);
	}
};

export const getCurrentRiskController = async (req: Request, res: Response): Promise<void> => {
	const userId = String(req.params.userId || '').trim();
	if (!userId) throw new AppError('userId is required', 422);
	assertUserScope(req, userId);
	const data = await getCurrentRisk(userId);
	sendSuccess(res, data, 'Current risk fetched');
};

export const getRiskHistoryController = async (req: Request, res: Response): Promise<void> => {
	const userId = String(req.params.userId || '').trim();
	if (!userId) throw new AppError('userId is required', 422);
	assertUserScope(req, userId);
	const data = await getRiskHistory(userId);
	sendSuccess(res, data, 'Risk history fetched');
};

export const getMoodPredictionController = async (req: Request, res: Response): Promise<void> => {
	const userId = String(req.params.userId || '').trim();
	if (!userId) throw new AppError('userId is required', 422);
	assertUserScope(req, userId);
	const data = await getMoodPrediction(userId);
	sendSuccess(res, data, 'Mood prediction fetched');
};

export const getMoodHistoryController = async (req: Request, res: Response): Promise<void> => {
	const userId = String(req.params.userId || '').trim();
	if (!userId) throw new AppError('userId is required', 422);
	assertUserScope(req, userId);
	const data = await getMoodHistory(userId);
	sendSuccess(res, data, 'Mood history fetched');
};

export const getMoodAccuracyController = async (req: Request, res: Response): Promise<void> => {
	const userId = String(req.params.userId || '').trim();
	if (!userId) throw new AppError('userId is required', 422);
	assertUserScope(req, userId);
	const data = await getMoodAccuracy(userId);
	sendSuccess(res, data, 'Mood prediction accuracy fetched');
};

export const getOpenEscalationsController = async (req: Request, res: Response): Promise<void> => {
	const role = String(req.auth?.role || '').toLowerCase();
	if (!['admin', 'superadmin', 'therapist', 'psychiatrist', 'coach'].includes(role)) {
		throw new AppError('Access denied', 403);
	}
	const data = await getOpenEscalations();
	sendSuccess(res, data, 'Open escalations fetched');
};

export const acknowledgeEscalationController = async (req: Request, res: Response): Promise<void> => {
	const role = String(req.auth?.role || '').toLowerCase();
	if (!['admin', 'superadmin', 'therapist', 'psychiatrist', 'coach'].includes(role)) {
		throw new AppError('Access denied', 403);
	}
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('Escalation id is required', 422);
	const therapistId = String(req.auth?.userId || '');
	const data = await acknowledgeEscalationById(id, therapistId);
	sendSuccess(res, data, 'Escalation acknowledged');
};

export const resolveEscalationController = async (req: Request, res: Response): Promise<void> => {
	const role = String(req.auth?.role || '').toLowerCase();
	if (!['admin', 'superadmin', 'therapist', 'psychiatrist', 'coach'].includes(role)) {
		throw new AppError('Access denied', 403);
	}
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('Escalation id is required', 422);
	const data = await resolveEscalationById(id);
	sendSuccess(res, data, 'Escalation resolved');
};
