import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	chatWithAi,
	createMoodLog,
	getMoodHistory,
	getPatientDashboard,
	getProviderById,
	getSessionHistory,
	getUpcomingSessions,
	initiateSessionBooking,
	listNotifications,
	listProviders,
	markNotificationRead,
	submitAssessment,
	verifySessionPaymentAndCreateSession,
} from '../services/patient-v1.service';

const authUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) throw new AppError('Authentication required', 401);
	return userId;
};

export const getPatientDashboardController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientDashboard(authUserId(req));
	sendSuccess(res, data, 'Patient dashboard fetched');
};

export const listProvidersController = async (req: Request, res: Response): Promise<void> => {
	const result = await listProviders({
		specialization: typeof req.query.specialization === 'string' ? req.query.specialization : undefined,
		language: typeof req.query.language === 'string' ? req.query.language : undefined,
		minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
		maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
		page: req.query.page ? Number(req.query.page) : 1,
		limit: req.query.limit ? Number(req.query.limit) : 10,
	});
	sendSuccess(res, result, 'Providers fetched');
};

export const getProviderByIdController = async (req: Request, res: Response): Promise<void> => {
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('provider id is required', 422);
	const provider = await getProviderById(id);
	sendSuccess(res, provider, 'Provider fetched');
};

export const bookSessionController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const providerId = String(req.body.providerId || '').trim();
	const scheduledAt = new Date(req.body.scheduledAt);
	if (!providerId) throw new AppError('providerId is required', 422);
	if (Number.isNaN(scheduledAt.getTime())) throw new AppError('scheduledAt must be a valid datetime', 422);

	const result = await initiateSessionBooking(userId, {
		providerId,
		scheduledAt,
		durationMinutes: req.body.durationMinutes ? Number(req.body.durationMinutes) : undefined,
		amountMinor: req.body.amountMinor ? Number(req.body.amountMinor) : undefined,
	});

	sendSuccess(res, result, 'Booking initiated', 201);
};

export const verifyPaymentController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const razorpay_order_id = String(req.body.razorpay_order_id || '').trim();
	const razorpay_payment_id = String(req.body.razorpay_payment_id || '').trim();
	const razorpay_signature = String(req.body.razorpay_signature || '').trim();
	if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
		throw new AppError('razorpay_order_id, razorpay_payment_id and razorpay_signature are required', 422);
	}
	const result = await verifySessionPaymentAndCreateSession(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature });
	sendSuccess(res, result, 'Payment verified and session confirmed');
};

export const upcomingSessionsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getUpcomingSessions(authUserId(req));
	sendSuccess(res, data, 'Upcoming sessions fetched');
};

export const sessionHistoryController = async (req: Request, res: Response): Promise<void> => {
	const data = await getSessionHistory(authUserId(req));
	sendSuccess(res, data, 'Session history fetched');
};

export const submitAssessmentController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const type = String(req.body.type || '').trim();
	if (!type) throw new AppError('type is required', 422);
	const result = await submitAssessment(userId, {
		type,
		score: req.body.score !== undefined ? Number(req.body.score) : undefined,
		answers: Array.isArray(req.body.answers) ? req.body.answers.map((a: any) => Number(a)) : undefined,
	});
	sendSuccess(res, result, 'Assessment submitted', 201);
};

export const createMoodController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const result = await createMoodLog(userId, { mood: Number(req.body.mood), note: req.body.note ? String(req.body.note) : undefined });
	sendSuccess(res, result, 'Mood logged', 201);
};

export const moodHistoryController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMoodHistory(authUserId(req));
	sendSuccess(res, data, 'Mood history fetched');
};

export const aiChatController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const result = await chatWithAi(userId, { message: String(req.body.message || '') });
	sendSuccess(res, result, 'AI response generated');
};

export const listNotificationsController = async (req: Request, res: Response): Promise<void> => {
	const data = await listNotifications(authUserId(req));
	sendSuccess(res, data, 'Notifications fetched');
};

export const markNotificationReadController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('notification id is required', 422);
	const data = await markNotificationRead(userId, id);
	sendSuccess(res, data, 'Notification marked as read');
};
