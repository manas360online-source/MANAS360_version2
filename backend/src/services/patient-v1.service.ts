import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { decryptSessionNote } from '../utils/encryption';
import { createSessionPayment } from './payment.service';
import { verifyRazorpayPaymentSignature } from './razorpay.service';
import { processChatMessage } from './chat.service';

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
	// TODO: Replace therapist mock data once therapist module is integrated.
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

	const [user, upcomingRaw, recentSessionsRaw, lastAssessment, recentMoodRaw, therapistUsers, exercises, progress] = await Promise.all([
		db.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
		}),
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
		db.therapySession.findMany({
			where: { patientProfileId: patientProfile.id },
			orderBy: { dateTime: 'desc' },
			take: 20,
			select: {
				id: true,
				dateTime: true,
				status: true,
				sessionFeeMinor: true,
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
			select: { id: true, moodScore: true, note: true, date: true },
		}),
		db.user.findMany({
			where: { role: 'THERAPIST', isDeleted: false },
			select: { id: true, firstName: true, lastName: true, name: true },
			take: 8,
		}),
		db.patientExercise.findMany({
			where: { patientId: patientProfile.id },
			orderBy: { createdAt: 'desc' },
			take: 6,
			select: { id: true, title: true, assignedBy: true, duration: true, status: true, createdAt: true },
		}).catch(() => []),
		db.patientProgress.findUnique({
			where: { patientId: patientProfile.id },
			select: {
				sessionsCompleted: true,
				totalSessions: true,
				exercisesCompleted: true,
				totalExercises: true,
				phqStart: true,
				phqCurrent: true,
			},
		}).catch(() => null),
	]);

	const recommendedProviders = await Promise.all(therapistUsers.map((u: any) => toProviderListItem(u)));
	const userName = String(user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Patient');
	const moodTrend = [...recentMoodRaw]
		.reverse()
		.map((entry: any) => ({
			date: entry.date,
			score: Number(entry.moodScore || 0),
			note: entry.note || null,
		}));

	const avgMood = moodTrend.length
		? moodTrend.reduce((sum: number, entry: any) => sum + Number(entry.score || 0), 0) / moodTrend.length
		: 3;

	const completedSessions = recentSessionsRaw.filter((row: any) => String(row.status) === 'COMPLETED').length;
	const totalSessions = Math.max(completedSessions + upcomingRaw.length, progress?.totalSessions || 0);
	const upcomingSession = upcomingRaw[0]
		? {
			id: upcomingRaw[0].id,
			bookingReferenceId: upcomingRaw[0].bookingReferenceId,
			scheduledAt: upcomingRaw[0].dateTime,
			status: String(upcomingRaw[0].status).toLowerCase(),
			agoraChannel: upcomingRaw[0].agoraChannel,
			provider: {
				id: upcomingRaw[0].therapistProfile.id,
				name: String(upcomingRaw[0].therapistProfile.name || `${upcomingRaw[0].therapistProfile.firstName || ''} ${upcomingRaw[0].therapistProfile.lastName || ''}`.trim() || 'Therapist'),
			},
		}
		: null;

	const recentActivity = [
		...recentSessionsRaw.slice(0, 4).map((session: any) => ({
			id: `session-${session.id}`,
			type: 'session',
			title: `Session ${String(session.status).toLowerCase()}`,
			description: String(session.therapistProfile?.name || `${session.therapistProfile?.firstName || ''} ${session.therapistProfile?.lastName || ''}`.trim() || 'Therapist'),
			date: session.dateTime,
		})),
		...recentMoodRaw.slice(0, 3).map((mood: any, index: number) => ({
			id: `mood-${mood.id || mood.date || index}-${index}`,
			type: 'mood',
			title: 'Mood check-in saved',
			description: mood.note ? String(mood.note) : `Mood score ${mood.moodScore}/5`,
			date: mood.date,
		})),
	]
		.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 8);

	const progressPayload = progress
		? {
			sessionsCompleted: progress.sessionsCompleted,
			totalSessions: progress.totalSessions,
			exercisesCompleted: progress.exercisesCompleted,
			totalExercises: progress.totalExercises,
			phqStart: progress.phqStart,
			phqCurrent: progress.phqCurrent,
		}
		: {
			sessionsCompleted: completedSessions,
			totalSessions: Math.max(totalSessions, 1),
			exercisesCompleted: exercises.filter((item: any) => String(item.status) === 'COMPLETED').length,
			totalExercises: Math.max(exercises.length, 1),
			phqStart: null,
			phqCurrent: lastAssessment?.totalScore ?? null,
		};

	return {
		user: {
			id: user?.id,
			name: userName,
			email: user?.email || null,
			role: String(user?.role || 'PATIENT').toLowerCase(),
			createdAt: user?.createdAt,
		},
		wellnessScore: Math.max(0, Math.min(100, Math.round((avgMood / 5) * 100))),
		sessionsCompleted: progressPayload.sessionsCompleted,
		totalSessions: progressPayload.totalSessions,
		streak: moodTrend.length,
		moodTrend,
		upcomingSession,
		progress: progressPayload,
		recentActivity,
		exercises,
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
			...exercises.map((exercise: any) => ({
				id: exercise.id,
				title: exercise.title,
				category: 'Exercise',
			})),
		],
	};
};

const ensureSubscriptionRecord = async (userId: string) => {
	let subscription = await db.patientSubscription.findUnique({ where: { userId } }).catch(() => null);
	if (!subscription) {
		subscription = await db.patientSubscription.create({
			data: {
				userId,
				planName: 'Premium Plan',
				price: 2499,
				billingCycle: 'monthly',
				status: 'active',
				autoRenew: true,
				renewalDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
			},
		}).catch(() => null);
	}
	return subscription;
};

export const getPatientSubscription = async (userId: string) => {
	const subscription = await ensureSubscriptionRecord(userId);
	if (!subscription) throw new AppError('Subscription data unavailable', 500);
	return subscription;
};

export const updatePatientSubscriptionPlan = async (userId: string, action: 'upgrade' | 'downgrade') => {
	const subscription = await ensureSubscriptionRecord(userId);
	if (!subscription) throw new AppError('Subscription data unavailable', 500);

	const planOrder = ['basic', 'premium', 'pro'];
	const current = String(subscription.planName || 'premium').toLowerCase().replace(' plan', '');
	const currentIndex = Math.max(planOrder.indexOf(current), 0);
	const nextIndex = action === 'upgrade'
		? Math.min(planOrder.length - 1, currentIndex + 1)
		: Math.max(0, currentIndex - 1);
	const nextPlan = planOrder[nextIndex];
	const price = nextPlan === 'basic' ? 999 : nextPlan === 'premium' ? 2499 : 4999;

	return db.patientSubscription.update({
		where: { userId },
		data: {
			planName: `${nextPlan[0].toUpperCase()}${nextPlan.slice(1)} Plan`,
			price,
			billingCycle: nextPlan === 'pro' ? 'yearly' : 'monthly',
			status: 'active',
			autoRenew: true,
			renewalDate: new Date(new Date().getTime() + (nextPlan === 'pro' ? 365 : 30) * 24 * 60 * 60 * 1000),
		},
	});
};

export const cancelPatientSubscription = async (userId: string) => {
	await ensureSubscriptionRecord(userId);
	return db.patientSubscription.update({
		where: { userId },
		data: {
			status: 'cancelled',
			autoRenew: false,
		},
	});
};

export const reactivatePatientSubscription = async (userId: string) => {
	await ensureSubscriptionRecord(userId);
	return db.patientSubscription.update({
		where: { userId },
		data: {
			status: 'active',
			autoRenew: true,
			renewalDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
		},
	});
};

export const setPatientSubscriptionAutoRenew = async (userId: string, autoRenew: boolean) => {
	await ensureSubscriptionRecord(userId);
	return db.patientSubscription.update({
		where: { userId },
		data: { autoRenew },
	});
};

export const getPatientPaymentMethod = async (userId: string) => {
	return db.patientPaymentMethod.findUnique({ where: { userId } }).catch(() => null);
};

export const updatePatientPaymentMethod = async (
	userId: string,
	input: { cardLast4: string; cardBrand: string; expiryMonth: number; expiryYear: number },
) => {
	return db.patientPaymentMethod.upsert({
		where: { userId },
		update: {
			cardLast4: input.cardLast4,
			cardBrand: input.cardBrand,
			expiryMonth: input.expiryMonth,
			expiryYear: input.expiryYear,
		},
		create: {
			userId,
			cardLast4: input.cardLast4,
			cardBrand: input.cardBrand,
			expiryMonth: input.expiryMonth,
			expiryYear: input.expiryYear,
		},
	});
};

export const getPatientInvoices = async (userId: string) => {
	const invoices = await db.patientInvoice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => []);
	return invoices;
};

export const getPatientInvoiceById = async (userId: string, invoiceId: string) => {
	const invoice = await db.patientInvoice.findFirst({ where: { id: invoiceId, userId } }).catch(() => null);
	if (!invoice) throw new AppError('Invoice not found', 404);
	return invoice;
};

export const getPatientExercises = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	return db.patientExercise.findMany({ where: { patientId: patientProfile.id }, orderBy: { createdAt: 'desc' } }).catch(() => []);
};

export const completePatientExercise = async (userId: string, exerciseId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const updated = await db.patientExercise.updateMany({
		where: { id: exerciseId, patientId: patientProfile.id },
		data: { status: 'COMPLETED' },
	});
	if (!updated.count) throw new AppError('Exercise not found', 404);
	return { id: exerciseId, status: 'COMPLETED' };
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

export const getSessionDetail = async (userId: string, sessionId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const session = await db.therapySession.findFirst({
		where: { id: sessionId, patientProfileId: patientProfile.id },
		select: {
			id: true,
			bookingReferenceId: true,
			dateTime: true,
			status: true,
			durationMinutes: true,
			sessionFeeMinor: true,
			paymentStatus: true,
			agoraChannel: true,
			noteEncryptedContent: true,
			noteIv: true,
			noteAuthTag: true,
			noteUpdatedAt: true,
			therapistProfile: { select: { id: true, firstName: true, lastName: true, name: true, role: true } },
		},
	});

	if (!session) throw new AppError('Session not found', 404);

	let decryptedNotes: string | null = null;
	if (session.noteEncryptedContent && session.noteIv && session.noteAuthTag) {
		try {
			decryptedNotes = decryptSessionNote({
				encryptedContent: session.noteEncryptedContent,
				iv: session.noteIv,
				authTag: session.noteAuthTag,
			});
		} catch {
			decryptedNotes = null;
		}
	}

	const providerName = String(session.therapistProfile.name || `${session.therapistProfile.firstName || ''} ${session.therapistProfile.lastName || ''}`.trim() || 'Therapist');
	const providerRole = String(session.therapistProfile.role || '').toLowerCase();
	const hasPrescription = providerRole === 'psychiatrist';

	return {
		id: session.id,
		booking_reference: session.bookingReferenceId,
		scheduled_at: session.dateTime,
		status: String(session.status).toLowerCase(),
		duration_minutes: session.durationMinutes,
		session_fee: Number(session.sessionFeeMinor),
		payment_status: session.paymentStatus,
		agora_channel: session.agoraChannel,
		provider: {
			id: session.therapistProfile.id,
			name: providerName,
			role: providerRole,
		},
		notes: {
			content: decryptedNotes,
			updated_at: session.noteUpdatedAt,
			available: Boolean(decryptedNotes),
		},
		prescription: {
			available: false,
			requires_psychiatrist: hasPrescription,
			message: hasPrescription
				? 'Prescription is not shared yet.'
				: 'Prescription applies to psychiatrist sessions only.',
		},
		documents: {
			session_pdf_available: true,
			invoice_available: ['PAID', 'CAPTURED'].includes(String(session.paymentStatus || '').toUpperCase()),
			invoice_reference: session.bookingReferenceId,
		},
	};
};

export const getSessionDocumentPayload = async (userId: string, sessionId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const session = await db.therapySession.findFirst({
		where: { id: sessionId, patientProfileId: patientProfile.id },
		select: {
			id: true,
			bookingReferenceId: true,
			dateTime: true,
			status: true,
			durationMinutes: true,
			sessionFeeMinor: true,
			paymentStatus: true,
			noteEncryptedContent: true,
			noteIv: true,
			noteAuthTag: true,
			noteUpdatedAt: true,
			createdAt: true,
			updatedAt: true,
			patientProfile: {
				select: {
					user: { select: { id: true, firstName: true, lastName: true, name: true, email: true } },
				},
			},
			therapistProfile: { select: { id: true, firstName: true, lastName: true, name: true, email: true, role: true } },
		},
	});

	if (!session) throw new AppError('Session not found', 404);

	let notes: string | null = null;
	if (session.noteEncryptedContent && session.noteIv && session.noteAuthTag) {
		try {
			notes = decryptSessionNote({
				encryptedContent: session.noteEncryptedContent,
				iv: session.noteIv,
				authTag: session.noteAuthTag,
			});
		} catch {
			notes = null;
		}
	}

	const patientName = String(
		session.patientProfile.user.name
			|| `${session.patientProfile.user.firstName || ''} ${session.patientProfile.user.lastName || ''}`.trim()
			|| 'Patient',
	);
	const therapistName = String(
		session.therapistProfile.name
			|| `${session.therapistProfile.firstName || ''} ${session.therapistProfile.lastName || ''}`.trim()
			|| 'Therapist',
	);

	return {
		sessionId: session.id,
		bookingReferenceId: session.bookingReferenceId,
		scheduledAt: session.dateTime,
		status: String(session.status).toUpperCase(),
		durationMinutes: session.durationMinutes,
		sessionFeeMinor: Number(session.sessionFeeMinor),
		paymentStatus: String(session.paymentStatus || 'UNPAID').toUpperCase(),
		notes,
		noteUpdatedAt: session.noteUpdatedAt,
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
		patient: {
			id: session.patientProfile.user.id,
			name: patientName,
			email: session.patientProfile.user.email || null,
		},
		therapist: {
			id: session.therapistProfile.id,
			name: therapistName,
			email: session.therapistProfile.email || null,
			role: String(session.therapistProfile.role || '').toLowerCase(),
		},
	};
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
	const moodValue = Math.floor(input.mood);
	const note = input.note?.trim() || null;
	const now = new Date();

	let created: any | null = null;
	const patientMoodModel = db.patientMoodEntry;
	if (patientMoodModel && typeof patientMoodModel.create === 'function') {
		created = await patientMoodModel
			.create({
				data: {
					patientId: patientProfile.id,
					moodScore: moodValue,
					note,
					date: now,
				},
			})
			.catch(() => null);
	}

	let moodLog: any | null = null;
	const moodLogModel = db.moodLog;
	if (moodLogModel && typeof moodLogModel.create === 'function') {
		moodLog = await moodLogModel
			.create({
				data: {
					userId,
					moodValue,
					note,
					source: 'manual',
					loggedAt: now,
				},
			})
			.catch(() => null);
	}

	return {
		id: created?.id || moodLog?.id,
		mood: Number(created?.moodScore ?? moodLog?.moodValue ?? moodValue),
		note: created?.note ?? moodLog?.note ?? note,
		created_at: created?.createdAt ?? moodLog?.createdAt ?? now,
	};
};

export const getMoodHistory = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const patientMoodModel = db.patientMoodEntry;
	if (patientMoodModel && typeof patientMoodModel.findMany === 'function') {
		const rows = await patientMoodModel.findMany({ where: { patientId: patientProfile.id }, orderBy: { date: 'desc' }, take: 60 });
		return rows.map((r: any) => ({ id: r.id, mood: r.moodScore, note: r.note, created_at: r.createdAt }));
	}

	const moodLogModel = db.moodLog;
	if (!moodLogModel || typeof moodLogModel.findMany !== 'function') {
		return [];
	}

	const moodLogRows = await moodLogModel.findMany({ where: { userId }, orderBy: { loggedAt: 'desc' }, take: 60 }).catch(() => []);
	return moodLogRows.map((row: any) => ({
		id: row.id,
		mood: Number(row.moodValue || 0),
		note: row.note,
		created_at: row.createdAt || row.loggedAt,
	}));
};

export const getMoodToday = async (userId: string) => {
	const history = await getMoodHistory(userId);
	const now = new Date();
	const dayStart = new Date(now);
	dayStart.setHours(0, 0, 0, 0);

	const todayEntries = history.filter((entry: any) => {
		const at = new Date(entry.created_at);
		return !Number.isNaN(at.getTime()) && at >= dayStart;
	});

	const latest = todayEntries[0] || null;
	return {
		date: dayStart.toISOString(),
		entryCount: todayEntries.length,
		latest,
	};
};

export const getMoodStats = async (userId: string) => {
	const history = await getMoodHistory(userId);
	if (!history.length) {
		return {
			totalCheckins: 0,
			averageMood: 0,
			last7DaysAverage: 0,
			last30DaysAverage: 0,
			currentStreak: 0,
			longestStreak: 0,
			highestMood: 0,
			lowestMood: 0,
		};
	}

	const rows = history
		.map((entry: any) => ({
			mood: Number(entry.mood || 0),
			createdAt: new Date(entry.created_at),
		}))
		.filter((entry: any) => Number.isFinite(entry.mood) && !Number.isNaN(entry.createdAt.getTime()));

	if (!rows.length) {
		return {
			totalCheckins: 0,
			averageMood: 0,
			last7DaysAverage: 0,
			last30DaysAverage: 0,
			currentStreak: 0,
			longestStreak: 0,
			highestMood: 0,
			lowestMood: 0,
		};
	}

	const average = (items: any[]) =>
		items.length
			? Number((items.reduce((sum: number, item: any) => sum + Number(item.mood || 0), 0) / items.length).toFixed(2))
			: 0;

	const now = new Date();
	const day7 = new Date(now);
	day7.setDate(day7.getDate() - 7);
	const day30 = new Date(now);
	day30.setDate(day30.getDate() - 30);

	const last7 = rows.filter((entry: any) => entry.createdAt >= day7);
	const last30 = rows.filter((entry: any) => entry.createdAt >= day30);

	const sortedDays = [...new Set(rows.map((entry: any) => entry.createdAt.toISOString().slice(0, 10)))] as string[];
	sortedDays.sort((a, b) => b.localeCompare(a));
	let currentStreak = 0;
	let cursor = new Date();
	cursor.setHours(0, 0, 0, 0);

	for (const day of sortedDays) {
		const cursorKey = cursor.toISOString().slice(0, 10);
		if (day === cursorKey) {
			currentStreak += 1;
			cursor.setDate(cursor.getDate() - 1);
			continue;
		}
		if (currentStreak === 0) {
			cursor.setDate(cursor.getDate() - 1);
			if (day === cursor.toISOString().slice(0, 10)) {
				currentStreak += 1;
				cursor.setDate(cursor.getDate() - 1);
				continue;
			}
		}
		break;
	}

	let longestStreak = 0;
	let streak = 0;
	let prevDay: Date | null = null;
	const ascDays = [...sortedDays].reverse();
	for (const day of ascDays) {
		const date = new Date(`${day}T00:00:00.000Z`);
		if (!prevDay) {
			streak = 1;
		} else {
			const diffDays = Math.round((date.getTime() - prevDay.getTime()) / (24 * 60 * 60 * 1000));
			streak = diffDays === 1 ? streak + 1 : 1;
		}
		if (streak > longestStreak) longestStreak = streak;
		prevDay = date;
	}

	return {
		totalCheckins: rows.length,
		averageMood: average(rows),
		last7DaysAverage: average(last7),
		last30DaysAverage: average(last30),
		currentStreak,
		longestStreak,
		highestMood: Math.max(...rows.map((entry: any) => entry.mood)),
		lowestMood: Math.min(...rows.map((entry: any) => entry.mood)),
	};
};

export const getPatientProgressAnalytics = async (userId: string) => {
	const patientProfile = await getPatientProfile(userId);
	const [sessions, exercises, assessments, moodHistory] = await Promise.all([
		db.therapySession.findMany({
			where: { patientProfileId: patientProfile.id },
			select: { id: true, status: true, dateTime: true },
			orderBy: { dateTime: 'asc' },
		}),
		db.patientExercise.findMany({
			where: { patientId: patientProfile.id },
			select: { id: true, status: true, createdAt: true },
			orderBy: { createdAt: 'asc' },
		}).catch(() => []),
		db.patientAssessment.findMany({
			where: { patientId: patientProfile.id },
			select: { id: true, type: true, totalScore: true, severityLevel: true, createdAt: true },
			orderBy: { createdAt: 'asc' },
			take: 20,
		}),
		getMoodHistory(userId),
	]);

	const totalSessions = sessions.length;
	const completedSessions = sessions.filter((session: any) => String(session.status).toUpperCase() === 'COMPLETED').length;
	const totalExercises = exercises.length;
	const completedExercises = exercises.filter((exercise: any) => String(exercise.status).toUpperCase() === 'COMPLETED').length;

	const moodByWeek = (() => {
		const map = new Map<string, { week: string; total: number; count: number }>();
		for (const entry of moodHistory) {
			const date = new Date(entry.created_at);
			if (Number.isNaN(date.getTime())) continue;
			const weekStart = new Date(date);
			const day = weekStart.getDay();
			const diff = day === 0 ? -6 : 1 - day;
			weekStart.setDate(weekStart.getDate() + diff);
			weekStart.setHours(0, 0, 0, 0);
			const key = weekStart.toISOString().slice(0, 10);
			const existing = map.get(key) || { week: key, total: 0, count: 0 };
			existing.total += Number(entry.mood || 0);
			existing.count += 1;
			map.set(key, existing);
		}
		return [...map.values()]
			.sort((a, b) => a.week.localeCompare(b.week))
			.slice(-8)
			.map((item) => ({ week: item.week, averageMood: Number((item.total / item.count).toFixed(2)) }));
	})();

	const assessmentTrend = assessments.map((item: any) => ({
		id: item.id,
		type: item.type,
		score: item.totalScore,
		severity: item.severityLevel,
		createdAt: item.createdAt,
	}));

	const latestAssessment = assessments[assessments.length - 1] || null;
	const firstAssessment = assessments[0] || null;
	const scoreDelta = firstAssessment && latestAssessment
		? Number(latestAssessment.totalScore || 0) - Number(firstAssessment.totalScore || 0)
		: 0;

	return {
		summary: {
			totalSessions,
			completedSessions,
			sessionCompletionRate: totalSessions ? Number(((completedSessions / totalSessions) * 100).toFixed(1)) : 0,
			totalExercises,
			completedExercises,
			exerciseCompletionRate: totalExercises ? Number(((completedExercises / totalExercises) * 100).toFixed(1)) : 0,
			moodCheckins: moodHistory.length,
		},
		moodTrend: moodByWeek,
		assessmentTrend,
		insights: {
			latestAssessmentScore: latestAssessment?.totalScore ?? null,
			latestAssessmentSeverity: latestAssessment?.severityLevel ?? null,
			assessmentScoreDelta: scoreDelta,
		},
	};
};

export const chatWithAi = async (userId: string, input: { message: string }) => {
	const message = String(input.message || '').trim();
	if (!message) throw new AppError('message is required', 422);
	const result = await processChatMessage({ userId, message, botType: 'mood_ai' });
	return {
		conversation_id: result.conversation_id,
		response: result.response,
		messages: result.messages,
		bot_name: result.bot_name,
		bot_type: result.bot_type,
		crisis_detected: result.crisis_detected,
	};
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

export const getPatientSettings = async (userId: string) => {
	const [latestSnapshot, patientProfile, user] = await Promise.all([
		db.notification.findFirst({
			where: { userId, type: 'PATIENT_SETTINGS_SNAPSHOT' },
			orderBy: { createdAt: 'desc' },
			select: { payload: true, createdAt: true },
		}),
		db.patientProfile.findUnique({ where: { userId }, select: { emergencyContact: true } }).catch(() => null),
		db.user.findUnique({ where: { id: userId }, select: { mfaEnabled: true } }).catch(() => null),
	]);

	const payloadSettings = latestSnapshot?.payload?.settings && typeof latestSnapshot.payload.settings === 'object'
		? latestSnapshot.payload.settings
		: null;

	const emergencyContact = patientProfile?.emergencyContact && typeof patientProfile.emergencyContact === 'object'
		? patientProfile.emergencyContact
		: null;

	const mergedSettings = {
		...(payloadSettings || {}),
		therapy: {
			...((payloadSettings as any)?.therapy || {}),
			emergencyName: String((emergencyContact as any)?.name || (payloadSettings as any)?.therapy?.emergencyName || ''),
			emergencyPhone: String((emergencyContact as any)?.phone || (payloadSettings as any)?.therapy?.emergencyPhone || ''),
			emergencyRelationship: String((emergencyContact as any)?.relationship || (payloadSettings as any)?.therapy?.emergencyRelationship || ''),
		},
		security: {
			...((payloadSettings as any)?.security || {}),
			twoFactorEnabled: Boolean((payloadSettings as any)?.security?.twoFactorEnabled ?? user?.mfaEnabled ?? false),
		},
	};

	return {
		settings: mergedSettings,
		savedAt: latestSnapshot?.createdAt || null,
	};
};

export const updatePatientSettings = async (userId: string, settings: Record<string, any>) => {
	if (!settings || typeof settings !== 'object') throw new AppError('settings payload is required', 422);

	const emergencyName = String(settings?.therapy?.emergencyName || '').trim();
	const emergencyPhone = String(settings?.therapy?.emergencyPhone || '').trim();
	const emergencyRelationship = String(settings?.therapy?.emergencyRelationship || '').trim();

	await Promise.all([
		db.notification.create({
			data: {
				userId,
				type: 'PATIENT_SETTINGS_SNAPSHOT',
				title: 'Patient settings updated',
				message: 'Patient settings were updated from account settings page.',
				payload: { settings },
				isRead: true,
				sentAt: new Date(),
			},
		}),
		db.user.updateMany({
			where: { id: userId, isDeleted: false },
			data: {
				mfaEnabled: Boolean(settings?.security?.twoFactorEnabled),
			},
		}),
		db.patientProfile.updateMany({
			where: { userId },
			data: {
				emergencyContact: {
					name: emergencyName,
					phone: emergencyPhone,
					relationship: emergencyRelationship,
				},
			},
		}).catch(() => ({ count: 0 })),
	]);

	return {
		settings,
		savedAt: new Date().toISOString(),
	};
};

export const getPatientSupportCenter = async (userId: string) => {
	const tickets = await db.notification.findMany({
		where: { userId, type: 'SUPPORT_TICKET' },
		orderBy: { createdAt: 'desc' },
		take: 20,
		select: {
			id: true,
			title: true,
			message: true,
			payload: true,
			createdAt: true,
		},
	});

	return {
		faqs: [
			{ id: 'faq-1', question: 'How do I reschedule a therapy session?', answer: 'Go to Sessions, open your session and choose reschedule if available.' },
			{ id: 'faq-2', question: 'How can I update my payment method?', answer: 'Open Settings → Billing & Subscription and update your payment details.' },
			{ id: 'faq-3', question: 'How do I contact crisis support?', answer: 'Use the Crisis Support option in the sidebar for immediate assistance.' },
		],
		emergencyContacts: [
			{ label: 'Tele-MANAS', value: '1800-599-0019' },
			{ label: 'Emergency', value: '112' },
		],
		tickets: tickets.map((ticket: any) => ({
			id: ticket.id,
			title: ticket.title,
			message: ticket.message,
			status: String(ticket.payload?.status || 'OPEN'),
			category: String(ticket.payload?.category || 'general'),
			priority: String(ticket.payload?.priority || 'medium'),
			createdAt: ticket.createdAt,
		})),
	};
};

export const createPatientSupportTicket = async (
	userId: string,
	input: { subject: string; message: string; category?: string; priority?: string },
) => {
	const subject = String(input.subject || '').trim();
	const message = String(input.message || '').trim();
	if (!subject) throw new AppError('subject is required', 422);
	if (!message) throw new AppError('message is required', 422);

	const created = await db.notification.create({
		data: {
			userId,
			type: 'SUPPORT_TICKET',
			title: subject,
			message,
			payload: {
				category: String(input.category || 'general'),
				priority: String(input.priority || 'medium'),
				status: 'OPEN',
				ticketRef: `SUP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
			},
			sentAt: new Date(),
		},
	});

	return {
		id: created.id,
		title: created.title,
		message: created.message,
		status: 'OPEN',
		category: String(created.payload?.category || 'general'),
		priority: String(created.payload?.priority || 'medium'),
		createdAt: created.createdAt,
	};
};
