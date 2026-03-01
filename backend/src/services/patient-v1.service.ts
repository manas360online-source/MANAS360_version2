import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { createSessionPayment } from './payment.service';
import { verifyRazorpayPaymentSignature } from './razorpay.service';

const db = prisma as any;

type ProviderFilters = {
	specialization?: string;
	language?: string;
	minPrice?: number;
	maxPrice?: number;
	page?: number;
	limit?: number;
};

const DEFAULT_SESSION_FEE_MINOR = 150000;
const DEFAULT_DURATION_MINUTES = 50;

const normalizePagination = (page = 1, limit = 10) => {
	const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
	const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(50, Math.floor(limit)) : 10;
	return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

const getPatientProfile = async (userId: string) => {
	const profile = await db.patientProfile.findUnique({ where: { userId }, select: { id: true } });
	if (!profile) throw new AppError('Patient profile not found. Please complete onboarding.', 404);
	return profile;
};

const mapSeverity = (score: number): 'Mild' | 'Moderate' | 'Severe' => {
	if (score <= 9) return 'Mild';
	if (score <= 19) return 'Moderate';
	return 'Severe';
};

const toProviderListItem = async (user: any) => {
	const categories = await db.cBTSessionTemplate.findMany({
		where: { therapistId: user.id, status: 'PUBLISHED' },
		select: { category: true },
		take: 10,
	});
	const specializations = [...new Set(categories.map((c: any) => String(c.category || '').trim()).filter(Boolean))];
	const completedSessions = await db.therapySession.count({ where: { therapistProfileId: user.id, status: 'COMPLETED' } });
	return {
		id: user.id,
		name: String(user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Therapist'),
		specialization: specializations[0] || 'General Wellness',
		specializations,
		experience_years: 3,
		session_rate: DEFAULT_SESSION_FEE_MINOR,
		bio: user.bio || 'Experienced mental wellness professional.',
		languages: ['English', 'Hindi'],
		rating_avg: completedSessions > 0 ? 4.6 : 4.4,
		is_active: true,
	};
};

export const getPatientDashboard = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const now = new Date();

	const [upcomingRaw, lastAssessment, recentMoodRaw, therapistUsers] = await Promise.all([
		db.therapySession.findMany({
			where: {
				patientProfileId: patientProfile.id,
				dateTime: { gte: now },
				status: { in: ['PENDING', 'CONFIRMED'] },
			},
			orderBy: { dateTime: 'asc' },
			take: 5,
			select: {
				id: true,
				bookingReferenceId: true,
				dateTime: true,
				status: true,
				agoraChannel: true,
				therapistProfile: { select: { id: true, firstName: true, lastName: true, name: true } },
			},
		}),
		db.patientAssessment.findFirst({
			where: { patientId: patientProfile.id },
			orderBy: { createdAt: 'desc' },
			select: { type: true, totalScore: true, severityLevel: true, createdAt: true },
		}),
		db.patientMoodEntry.findMany({
			where: { patientId: patientProfile.id },
			orderBy: { date: 'desc' },
			take: 7,
			select: { moodScore: true, note: true, date: true },
		}),
		db.user.findMany({
			where: { role: 'THERAPIST', isDeleted: false },
			select: { id: true, firstName: true, lastName: true, name: true },
			take: 8,
		}),
	]);

	const recommendedProviders = await Promise.all(therapistUsers.map((u: any) => toProviderListItem(u)));

	return {
		upcomingSessions: upcomingRaw.map((s: any) => ({
			id: s.id,
			bookingReferenceId: s.bookingReferenceId,
			scheduledAt: s.dateTime,
			status: String(s.status).toLowerCase(),
			agoraChannel: s.agoraChannel,
			provider: {
				id: s.therapistProfile.id,
				name: String(s.therapistProfile.name || `${s.therapistProfile.firstName || ''} ${s.therapistProfile.lastName || ''}`.trim() || 'Therapist'),
			},
		})),
		lastAssessment: lastAssessment
			? {
				type: lastAssessment.type,
				score: lastAssessment.totalScore,
				result_level: lastAssessment.severityLevel,
				createdAt: lastAssessment.createdAt,
			}
			: null,
		recentMoodLogs: recentMoodRaw,
		recommendedProviders: recommendedProviders.slice(0, 4),
		suggestedContent: [
			{ id: 'breathing-101', title: '5-minute calming breath practice', category: 'Mindfulness' },
			{ id: 'sleep-reset', title: 'Reset your sleep routine', category: 'Sleep' },
		],
	};
};

export const listProviders = async (filters: ProviderFilters) => {
	const { page, limit, skip } = normalizePagination(filters.page, filters.limit);
	const therapists = await db.user.findMany({
		where: { role: 'THERAPIST', isDeleted: false },
		select: { id: true, firstName: true, lastName: true, name: true },
		orderBy: { createdAt: 'desc' },
		skip,
		take: limit,
	});
	const total = await db.user.count({ where: { role: 'THERAPIST', isDeleted: false } });
	let items = await Promise.all(therapists.map((u: any) => toProviderListItem(u)));

	if (filters.specialization) {
		const s = filters.specialization.trim().toLowerCase();
		items = items.filter((p) => p.specializations.some((x) => x.toLowerCase().includes(s)) || p.specialization.toLowerCase().includes(s));
	}
	if (filters.language) {
		const l = filters.language.trim().toLowerCase();
		items = items.filter((p) => p.languages.some((x) => x.toLowerCase().includes(l)));
	}
	if (typeof filters.minPrice === 'number') items = items.filter((p) => p.session_rate >= filters.minPrice!);
	if (typeof filters.maxPrice === 'number') items = items.filter((p) => p.session_rate <= filters.maxPrice!);

	return {
		items,
		meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
	};
};

const slotCandidateMinutes = [10 * 60, 12 * 60, 16 * 60, 18 * 60];

export const getProviderById = async (providerId: string) => {
	const therapist = await db.user.findUnique({
		where: { id: providerId },
		select: { id: true, firstName: true, lastName: true, name: true, role: true, isDeleted: true },
	});
	if (!therapist || therapist.isDeleted || String(therapist.role) !== 'THERAPIST') throw new AppError('Provider not found', 404);

	const profile = await toProviderListItem(therapist);
	const now = new Date();
	const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	const existing = await db.therapySession.findMany({
		where: { therapistProfileId: providerId, dateTime: { gte: now, lte: end }, status: { in: ['PENDING', 'CONFIRMED'] } },
		select: { dateTime: true },
	});
	const blocked = new Set(existing.map((s: any) => new Date(s.dateTime).toISOString()));
	const availableSlots: string[] = [];

	for (let day = 0; day < 7; day += 1) {
		const d = new Date(now);
		d.setDate(now.getDate() + day);
		d.setSeconds(0, 0);
		for (const minuteOfDay of slotCandidateMinutes) {
			const slot = new Date(d);
			slot.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
			if (slot <= now) continue;
			if (!blocked.has(slot.toISOString())) availableSlots.push(slot.toISOString());
		}
	}

	return {
		...profile,
		available_slots: availableSlots,
	};
};

const buildBookingReferenceId = (): string => `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const generateAgoraDetails = (sessionId: string, scheduledAt: Date, durationMinutes: number) => {
	const channel = `session_${sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
	const expireAt = Math.floor((new Date(scheduledAt).getTime() + durationMinutes * 60 * 1000) / 1000);
	const appId = process.env.AGORA_APP_ID || 'agora-dev-app';
	const tokenSeed = `${appId}:${channel}:${expireAt}:${crypto.randomBytes(10).toString('hex')}`;
	const token = Buffer.from(tokenSeed).toString('base64url');
	return { channel, token, expireAt };
};

export const initiateSessionBooking = async (userId: string, input: { providerId: string; scheduledAt: Date; durationMinutes?: number; amountMinor?: number }) => {
	await getPatientProfile(userId);
	const provider = await db.user.findUnique({ where: { id: input.providerId }, select: { id: true, role: true, isDeleted: true } });
	if (!provider || provider.isDeleted || String(provider.role) !== 'THERAPIST') throw new AppError('Provider not found', 404);

	const scheduledAt = new Date(input.scheduledAt);
	if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) throw new AppError('scheduledAt must be a future datetime', 422);
	const duration = input.durationMinutes && input.durationMinutes > 0 ? Math.min(180, Math.floor(input.durationMinutes)) : DEFAULT_DURATION_MINUTES;
	const amountMinor = input.amountMinor && input.amountMinor > 0 ? Math.floor(input.amountMinor) : DEFAULT_SESSION_FEE_MINOR;

	const conflict = await db.therapySession.findFirst({
		where: { therapistProfileId: input.providerId, dateTime: scheduledAt, status: { in: ['PENDING', 'CONFIRMED'] } },
		select: { id: true },
	});
	if (conflict) throw new AppError('Selected slot is unavailable', 409);

	const payment = await createSessionPayment({ patientId: userId, providerId: input.providerId, amountMinor, currency: 'INR' });

	await db.sessionBookingIntent.create({
		data: {
			patientId: userId,
			providerId: input.providerId,
			scheduledAt,
			durationMinute: duration,
			amountMinor,
			currency: 'INR',
			razorpayOrderId: payment.razorpayOrderId,
			status: 'PENDING',
		},
	});

	return {
		order_id: payment.razorpayOrderId,
		amount: amountMinor,
		currency: 'INR',
		provider_id: input.providerId,
		scheduled_at: scheduledAt.toISOString(),
		duration_minutes: duration,
	};
};

export const verifySessionPaymentAndCreateSession = async (
	userId: string,
	input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
) => {
	const secret = process.env.RAZORPAY_KEY_SECRET;
	if (!secret) throw new AppError('Razorpay key secret not configured', 500);

	const isValid = verifyRazorpayPaymentSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature, secret);
	if (!isValid) throw new AppError('Invalid Razorpay signature', 401);

	const intent = await db.sessionBookingIntent.findUnique({ where: { razorpayOrderId: input.razorpay_order_id } });
	if (!intent || String(intent.patientId) !== userId) throw new AppError('Booking intent not found', 404);
	if (String(intent.status) === 'CONFIRMED' && intent.sessionId) {
		const existing = await db.therapySession.findUnique({ where: { id: intent.sessionId } });
		if (existing) return { sessionId: existing.id, status: 'confirmed', agora_channel: existing.agoraChannel, agora_token: existing.agoraToken };
	}

	const patientProfile = await getPatientProfile(userId);
	const conflict = await db.therapySession.findFirst({
		where: { therapistProfileId: intent.providerId, dateTime: intent.scheduledAt, status: { in: ['PENDING', 'CONFIRMED'] } },
		select: { id: true },
	});
	if (conflict) throw new AppError('Selected slot was already booked', 409);

	const created = await db.$transaction(async (tx: any) => {
		await tx.financialPayment.updateMany({
			where: { razorpayOrderId: input.razorpay_order_id, status: { in: ['INITIATED', 'PENDING_CAPTURE'] } },
			data: {
				status: 'CAPTURED',
				razorpayPaymentId: input.razorpay_payment_id,
				capturedAt: new Date(),
				therapistShareMinor: BigInt(Math.floor(Number(intent.amountMinor) * 0.6)),
				platformShareMinor: BigInt(Math.ceil(Number(intent.amountMinor) * 0.4)),
			},
		});

		await tx.financialSession.updateMany({
			where: { razorpayOrderId: input.razorpay_order_id },
			data: { status: 'CONFIRMED', confirmedAt: new Date() },
		});

		const session = await tx.therapySession.create({
			data: {
				bookingReferenceId: buildBookingReferenceId(),
				patientProfileId: patientProfile.id,
				therapistProfileId: intent.providerId,
				dateTime: intent.scheduledAt,
				durationMinutes: intent.durationMinute,
				sessionFeeMinor: intent.amountMinor,
				paymentStatus: 'PAID',
				status: 'CONFIRMED',
			},
		});

		const agora = generateAgoraDetails(session.id, intent.scheduledAt, intent.durationMinute);
		const sessionWithAgora = await tx.therapySession.update({
			where: { id: session.id },
			data: { agoraChannel: agora.channel, agoraToken: agora.token },
		});

		await tx.sessionBookingIntent.update({
			where: { razorpayOrderId: input.razorpay_order_id },
			data: {
				status: 'CONFIRMED',
				razorpayPaymentId: input.razorpay_payment_id,
				sessionId: session.id,
			},
		});

		await tx.notification.createMany({
			data: [
				{
					userId,
					type: 'BOOKING_CONFIRMED',
					title: 'Booking confirmed',
					message: 'Your therapy session has been confirmed.',
					payload: { sessionId: session.id, scheduledAt: intent.scheduledAt.toISOString() },
					sentAt: new Date(),
				},
				{
					userId,
					type: 'SESSION_REMINDER_24H',
					title: 'Session reminder',
					message: 'Reminder: your session is scheduled in 24 hours.',
					payload: { sessionId: session.id },
					scheduledAt: new Date(new Date(intent.scheduledAt).getTime() - 24 * 60 * 60 * 1000),
				},
				{
					userId,
					type: 'SESSION_REMINDER_1H',
					title: 'Session reminder',
					message: 'Reminder: your session starts in 1 hour.',
					payload: { sessionId: session.id },
					scheduledAt: new Date(new Date(intent.scheduledAt).getTime() - 60 * 60 * 1000),
				},
			],
		});

		return sessionWithAgora;
	});

	return {
		sessionId: created.id,
		status: 'confirmed',
		agora_channel: created.agoraChannel,
		agora_token: created.agoraToken,
		scheduled_at: created.dateTime,
	};
};

export const getUpcomingSessions = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const now = new Date();
	const sessions = await db.therapySession.findMany({
		where: { patientProfileId: patientProfile.id, dateTime: { gte: now }, status: { in: ['PENDING', 'CONFIRMED'] } },
		orderBy: { dateTime: 'asc' },
		select: {
			id: true,
			bookingReferenceId: true,
			dateTime: true,
			status: true,
			durationMinutes: true,
			sessionFeeMinor: true,
			agoraChannel: true,
			agoraToken: true,
			therapistProfile: { select: { id: true, firstName: true, lastName: true, name: true } },
		},
	});
	return sessions.map((s: any) => ({
		id: s.id,
		booking_reference: s.bookingReferenceId,
		scheduled_at: s.dateTime,
		status: String(s.status).toLowerCase(),
		duration_minutes: s.durationMinutes,
		session_fee: Number(s.sessionFeeMinor),
		agora_channel: s.agoraChannel,
		agora_token: s.agoraToken,
		provider: { id: s.therapistProfile.id, name: String(s.therapistProfile.name || `${s.therapistProfile.firstName || ''} ${s.therapistProfile.lastName || ''}`.trim()) },
	}));
};

export const getSessionHistory = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const sessions = await db.therapySession.findMany({
		where: { patientProfileId: patientProfile.id },
		orderBy: { dateTime: 'desc' },
		select: {
			id: true,
			bookingReferenceId: true,
			dateTime: true,
			status: true,
			durationMinutes: true,
			sessionFeeMinor: true,
			paymentStatus: true,
			therapistProfile: { select: { id: true, firstName: true, lastName: true, name: true } },
		},
	});
	return sessions.map((s: any) => ({
		id: s.id,
		booking_reference: s.bookingReferenceId,
		scheduled_at: s.dateTime,
		status: String(s.status).toLowerCase(),
		duration_minutes: s.durationMinutes,
		session_fee: Number(s.sessionFeeMinor),
		payment_status: s.paymentStatus,
		provider: { id: s.therapistProfile.id, name: String(s.therapistProfile.name || `${s.therapistProfile.firstName || ''} ${s.therapistProfile.lastName || ''}`.trim()) },
	}));
};

export const submitAssessment = async (userId: string, input: { type: string; score?: number; answers?: number[] }) => {
	const patientProfile = await getPatientProfile(userId);
	const computedScore = typeof input.score === 'number' ? Math.max(0, Math.floor(input.score)) : (input.answers || []).reduce((a, b) => a + Number(b || 0), 0);
	const answers = Array.isArray(input.answers) && input.answers.length > 0 ? input.answers.map((v) => Number(v || 0)) : [computedScore];
	const severity = mapSeverity(computedScore);
	const created = await db.patientAssessment.create({
		data: {
			patientId: patientProfile.id,
			type: input.type,
			answers,
			totalScore: computedScore,
			severityLevel: severity,
		},
	});

	await db.notification.create({
		data: {
			userId,
			type: 'ASSESSMENT_RECOMMENDATION',
			title: 'Assessment recommendation',
			message: `Your ${input.type} assessment is ${severity}. Follow up with a therapist for better support.`,
			payload: { assessmentId: created.id, score: computedScore, severity },
			sentAt: new Date(),
		},
	});

	return {
		id: created.id,
		type: created.type,
		score: created.totalScore,
		result_level: created.severityLevel,
		recommendation:
			severity === 'Severe'
				? 'Please schedule a therapist session within 24 hours.'
				: severity === 'Moderate'
					? 'Consider booking a session this week and continue mood tracking.'
					: 'Maintain your routine and continue weekly check-ins.',
	};
};

export const createMoodLog = async (userId: string, input: { mood: number; note?: string }) => {
	const patientProfile = await getPatientProfile(userId);
	if (!Number.isFinite(input.mood) || input.mood < 1 || input.mood > 5) throw new AppError('mood must be between 1 and 5', 422);
	const created = await db.patientMoodEntry.create({
		data: {
			patientId: patientProfile.id,
			moodScore: Math.floor(input.mood),
			note: input.note?.trim() || null,
			date: new Date(),
		},
	});
	return { id: created.id, mood: created.moodScore, note: created.note, created_at: created.createdAt };
};

export const getMoodHistory = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const rows = await db.patientMoodEntry.findMany({ where: { patientId: patientProfile.id }, orderBy: { date: 'desc' }, take: 60 });
	return rows.map((r: any) => ({ id: r.id, mood: r.moodScore, note: r.note, created_at: r.createdAt }));
};

const generateFallbackAiReply = (message: string): string => {
	const text = message.trim();
	if (!text) return 'I am here with you. Tell me how you are feeling right now.';
	return `I hear you: "${text}". Let's take one small step now — slow breathing for 60 seconds and then share what changed.`;
};

const callOpenAIIfConfigured = async (message: string, context: Array<{ role: 'user' | 'assistant'; content: string }>) => {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) return null;

	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
			temperature: 0.4,
			messages: [
				{ role: 'system', content: 'You are a supportive mental wellness assistant. Keep responses safe, concise, and non-diagnostic.' },
				...context,
				{ role: 'user', content: message },
			],
		}),
	});

	if (!response.ok) return null;
	const body = (await response.json()) as any;
	return body?.choices?.[0]?.message?.content ? String(body.choices[0].message.content) : null;
};

export const chatWithAi = async (userId: string, input: { message: string }) => {
	const message = String(input.message || '').trim();
	if (!message) throw new AppError('message is required', 422);

	const latest = await db.aiConversation.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
	const previousMessages = Array.isArray(latest?.messages) ? latest.messages : [];
	const context = previousMessages
		.slice(-10)
		.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }))
		.filter((m: any) => m.content);

	const aiReply = (await callOpenAIIfConfigured(message, context)) || generateFallbackAiReply(message);
	const updatedMessages = [...previousMessages, { role: 'user', content: message, at: new Date().toISOString() }, { role: 'assistant', content: aiReply, at: new Date().toISOString() }];

	const convo = latest
		? await db.aiConversation.update({ where: { id: latest.id }, data: { messages: updatedMessages } })
		: await db.aiConversation.create({ data: { userId, messages: updatedMessages } });

	return { conversation_id: convo.id, response: aiReply, messages: updatedMessages };
};

export const listNotifications = async (userId: string) => {
	const notifications = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
	return notifications.map((n: any) => ({
		id: n.id,
		type: n.type,
		title: n.title,
		message: n.message,
		payload: n.payload,
		is_read: n.isRead,
		scheduled_at: n.scheduledAt,
		sent_at: n.sentAt,
		created_at: n.createdAt,
	}));
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
	const updated = await db.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
	if (!updated.count) throw new AppError('Notification not found', 404);
	return { id: notificationId, is_read: true };
};
