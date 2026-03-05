import type { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { AppError } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response';
import {
	chatWithAi,
	cancelPatientSubscription,
	completePatientExercise,
	createMoodLog,
	getMoodToday,
	getMoodStats,
	getPatientExercises,
	getMoodHistory,
	getPatientProgressAnalytics,
	getPatientDashboard,
	getPatientInvoiceById,
	getPatientInvoices,
	getPatientPaymentMethod,
	getPatientSubscription,
	getProviderById,
	getSessionDocumentPayload,
	getSessionDetail,
	getSessionHistory,
	getUpcomingSessions,
	initiateSessionBooking,
	listNotifications,
	listProviders,
	markNotificationRead,
	getPatientSettings,
	updatePatientSettings,
	getPatientSupportCenter,
	createPatientSupportTicket,
	reactivatePatientSubscription,
	setPatientSubscriptionAutoRenew,
	submitAssessment,
	updatePatientPaymentMethod,
	updatePatientSubscriptionPlan,
	verifySessionPaymentAndCreateSession,
} from '../services/patient-v1.service';

const renderPdfBuffer = async (write: (doc: any) => void): Promise<Buffer> =>
	new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 48 });
		const chunks: Buffer[] = [];
		doc.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);
		write(doc);
		doc.end();
	});

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

export const sessionDetailController = async (req: Request, res: Response): Promise<void> => {
	const sessionId = String(req.params.id || '').trim();
	if (!sessionId) throw new AppError('session id is required', 422);
	const data = await getSessionDetail(authUserId(req), sessionId);
	sendSuccess(res, data, 'Session detail fetched');
};

export const sessionSummaryPdfController = async (req: Request, res: Response): Promise<void> => {
	const sessionId = String(req.params.id || '').trim();
	if (!sessionId) throw new AppError('session id is required', 422);

	const payload = await getSessionDocumentPayload(authUserId(req), sessionId);
	const pdf = await renderPdfBuffer((doc) => {
		doc.fontSize(20).font('Helvetica-Bold').text('MANAS360 Session Summary', { align: 'center' });
		doc.moveDown(0.6);
		doc.fontSize(10).font('Helvetica').fillColor('#444').text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
		doc.fillColor('#000');

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Session Information');
		doc.fontSize(10).font('Helvetica').text(`Booking Reference: ${payload.bookingReferenceId}`);
		doc.text(`Session ID: ${payload.sessionId}`);
		doc.text(`Date & Time: ${new Date(payload.scheduledAt).toLocaleString()}`);
		doc.text(`Status: ${payload.status}`);
		doc.text(`Duration: ${payload.durationMinutes} minutes`);
		doc.text(`Payment Status: ${payload.paymentStatus}`);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Care Team');
		doc.fontSize(10).font('Helvetica').text(`Patient: ${payload.patient.name}`);
		if (payload.patient.email) doc.text(`Patient Email: ${payload.patient.email}`);
		doc.text(`Provider: ${payload.therapist.name}`);
		doc.text(`Provider Role: ${payload.therapist.role || 'therapist'}`);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Session Notes');
		doc.fontSize(10).font('Helvetica');
		if (payload.notes) {
			doc.text(payload.notes, { width: 500 });
			if (payload.noteUpdatedAt) {
				doc.moveDown(0.5);
				doc.fontSize(9).fillColor('#666').text(`Last updated: ${new Date(payload.noteUpdatedAt).toLocaleString()}`);
				doc.fillColor('#000').fontSize(10);
			}
		} else {
			doc.text('No therapist notes are available for this session yet.');
		}
	});

	const fileName = `session-${payload.bookingReferenceId || payload.sessionId}.pdf`;
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
	res.status(200).send(pdf);
};

export const sessionInvoicePdfController = async (req: Request, res: Response): Promise<void> => {
	const sessionId = String(req.params.id || '').trim();
	if (!sessionId) throw new AppError('session id is required', 422);

	const payload = await getSessionDocumentPayload(authUserId(req), sessionId);
	if (!['PAID', 'CAPTURED'].includes(payload.paymentStatus)) {
		throw new AppError('Invoice is available only for paid sessions', 409);
	}

	const amount = (payload.sessionFeeMinor / 100).toFixed(2);
	const taxRate = 0.18;
	const subtotal = payload.sessionFeeMinor / 100;
	const tax = subtotal * taxRate;
	const total = subtotal + tax;

	const pdf = await renderPdfBuffer((doc) => {
		doc.fontSize(20).font('Helvetica-Bold').text('MANAS360 Invoice', { align: 'center' });
		doc.moveDown(0.8);
		doc.fontSize(10).font('Helvetica').text(`Invoice No: INV-${payload.bookingReferenceId}`);
		doc.text(`Booking Reference: ${payload.bookingReferenceId}`);
		doc.text(`Session Date: ${new Date(payload.scheduledAt).toLocaleString()}`);
		doc.text(`Issued On: ${new Date().toLocaleDateString()}`);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Billed To');
		doc.fontSize(10).font('Helvetica').text(payload.patient.name);
		if (payload.patient.email) doc.text(payload.patient.email);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Service Details');
		doc.fontSize(10).font('Helvetica').text(`Provider: ${payload.therapist.name}`);
		doc.text(`Therapy Session (${payload.durationMinutes} mins)`);
		doc.text(`Amount: INR ${amount}`);

		doc.moveDown(0.8);
		doc.fontSize(12).font('Helvetica-Bold').text('Payment Breakdown');
		doc.fontSize(10).font('Helvetica').text(`Subtotal: INR ${subtotal.toFixed(2)}`);
		doc.text(`Tax (18%): INR ${tax.toFixed(2)}`);
		doc.font('Helvetica-Bold').text(`Total: INR ${total.toFixed(2)}`);
		doc.font('Helvetica').text(`Payment Status: ${payload.paymentStatus}`);
	});

	const fileName = `invoice-${payload.bookingReferenceId || payload.sessionId}.pdf`;
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
	res.status(200).send(pdf);
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

export const getPatientSettingsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientSettings(authUserId(req));
	sendSuccess(res, data, 'Patient settings fetched');
};

export const updatePatientSettingsController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const settings = req.body?.settings;
	const data = await updatePatientSettings(userId, settings);
	sendSuccess(res, data, 'Patient settings saved');
};

export const getPatientSupportCenterController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientSupportCenter(authUserId(req));
	sendSuccess(res, data, 'Support center data fetched');
};

export const createPatientSupportTicketController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const data = await createPatientSupportTicket(userId, {
		subject: String(req.body?.subject || ''),
		message: String(req.body?.message || ''),
		category: req.body?.category ? String(req.body.category) : undefined,
		priority: req.body?.priority ? String(req.body.priority) : undefined,
	});
	sendSuccess(res, data, 'Support ticket created', 201);
};

export const getPatientSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientSubscription(authUserId(req));
	sendSuccess(res, data, 'Subscription fetched');
};

export const upgradePatientSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await updatePatientSubscriptionPlan(authUserId(req), 'upgrade');
	sendSuccess(res, data, 'Subscription upgraded');
};

export const downgradePatientSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await updatePatientSubscriptionPlan(authUserId(req), 'downgrade');
	sendSuccess(res, data, 'Subscription downgraded');
};

export const cancelPatientSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await cancelPatientSubscription(authUserId(req));
	sendSuccess(res, data, 'Subscription cancelled');
};

export const reactivatePatientSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const data = await reactivatePatientSubscription(authUserId(req));
	sendSuccess(res, data, 'Subscription reactivated');
};

export const togglePatientSubscriptionAutoRenewController = async (req: Request, res: Response): Promise<void> => {
	const autoRenew = Boolean(req.body.autoRenew);
	const data = await setPatientSubscriptionAutoRenew(authUserId(req), autoRenew);
	sendSuccess(res, data, 'Subscription auto-renew updated');
};

export const getPatientPaymentMethodController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientPaymentMethod(authUserId(req));
	sendSuccess(res, data, 'Payment method fetched');
};

export const updatePatientPaymentMethodController = async (req: Request, res: Response): Promise<void> => {
	const payload = {
		cardLast4: String(req.body.cardLast4 || '').trim(),
		cardBrand: String(req.body.cardBrand || '').trim(),
		expiryMonth: Number(req.body.expiryMonth),
		expiryYear: Number(req.body.expiryYear),
	};
	if (!payload.cardLast4 || payload.cardLast4.length !== 4) throw new AppError('cardLast4 must be exactly 4 digits', 422);
	if (!payload.cardBrand) throw new AppError('cardBrand is required', 422);
	if (!Number.isFinite(payload.expiryMonth) || payload.expiryMonth < 1 || payload.expiryMonth > 12) throw new AppError('expiryMonth must be between 1 and 12', 422);
	if (!Number.isFinite(payload.expiryYear) || payload.expiryYear < 2000) throw new AppError('expiryYear is invalid', 422);
	const data = await updatePatientPaymentMethod(authUserId(req), payload);
	sendSuccess(res, data, 'Payment method updated');
};

export const getPatientInvoicesController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientInvoices(authUserId(req));
	sendSuccess(res, data, 'Invoices fetched');
};

export const downloadPatientInvoiceController = async (req: Request, res: Response): Promise<void> => {
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('invoice id is required', 422);
	const invoice = await getPatientInvoiceById(authUserId(req), id);

	const body = `MANAS360 Invoice\nInvoice ID: ${invoice.id}\nStatus: ${invoice.status}\nAmount: ${Number(invoice.amount || 0)}\nDate: ${new Date(invoice.createdAt).toISOString()}\nURL: ${invoice.invoiceUrl || ''}\n`;
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.id}.txt"`);
	res.status(200).send(body);
};

export const getPatientMoodController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMoodHistory(authUserId(req));
	sendSuccess(res, data, 'Mood history fetched');
};

export const getPatientMoodTodayController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMoodToday(authUserId(req));
	sendSuccess(res, data, 'Today mood fetched');
};

export const getPatientMoodStatsController = async (req: Request, res: Response): Promise<void> => {
	const data = await getMoodStats(authUserId(req));
	sendSuccess(res, data, 'Mood stats fetched');
};

export const getPatientProgressController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientProgressAnalytics(authUserId(req));
	sendSuccess(res, data, 'Patient progress fetched');
};

export const createPatientMoodController = async (req: Request, res: Response): Promise<void> => {
	const userId = authUserId(req);
	const result = await createMoodLog(userId, { mood: Number(req.body.mood), note: req.body.note ? String(req.body.note) : undefined });
	sendSuccess(res, result, 'Mood logged', 201);
};

export const getPatientExercisesController = async (req: Request, res: Response): Promise<void> => {
	const data = await getPatientExercises(authUserId(req));
	sendSuccess(res, data, 'Exercises fetched');
};

export const completePatientExerciseController = async (req: Request, res: Response): Promise<void> => {
	const id = String(req.params.id || '').trim();
	if (!id) throw new AppError('exercise id is required', 422);
	const data = await completePatientExercise(authUserId(req), id);
	sendSuccess(res, data, 'Exercise marked as completed');
};
