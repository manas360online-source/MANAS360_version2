import { randomBytes } from 'crypto';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { publishPlaceholderNotificationEvent } from './notification.service';
import { buildPaginationMeta, normalizePagination } from '../utils/pagination';
import { decryptSessionNote, encryptSessionNote } from '../utils/encryption';
import { analyticsService } from './analytics.service';
import { createClient } from 'redis';
import { env } from '../config/env';

const db = prisma as any;

interface BookSessionInput {
	therapistId: string;
	dateTime: Date;
}

interface SessionHistoryQuery {
	status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
	page: number;
	limit: number;
}

interface TherapistSessionHistoryQuery {
	status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
	patient?: string; // search text for patient name or email
	from?: string; // ISO date string
	to?: string; // ISO date string
	type?: string; // session type if available
	completion?: 'complete' | 'incomplete';
	page: number;
	limit: number;
}

interface TherapistSessionStatusPayload {
	status: 'confirmed' | 'cancelled' | 'completed';
}

interface TherapistSessionNotePayload {
	content: string;
}

interface TherapistEarningsQuery {
	fromDate?: Date;
	toDate?: Date;
	page: number;
	limit: number;
}

const ACTIVE_STATUSES = ['pending', 'confirmed'] as const;
const PRISMA_ACTIVE_STATUSES = ACTIVE_STATUSES.map((s) => s.toUpperCase());

const buildBookingReferenceId = (): string => {
	const prefix = 'BK';
	const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
	const randomPart = randomBytes(4).toString('hex').toUpperCase();

	return `${prefix}-${datePart}-${randomPart}`;
};

const getSlotMinuteOfDay = (date: Date): number => date.getHours() * 60 + date.getMinutes();

export const bookPatientSession = async (userId: string, input: BookSessionInput) => {
	const patientProfile = await db.patientProfile.findUnique({
		where: { userId },
		select: { id: true },
	});
	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

	const therapist = await db.user.findUnique({
		where: { id: input.therapistId },
		select: {
			id: true,
			role: true,
			firstName: true,
			lastName: true,
			name: true,
		},
	});

	if (!therapist || String(therapist.role) !== 'THERAPIST') {
		throw new AppError('Therapist not found', 404);
	}

	const now = new Date();
	if (input.dateTime <= now) {
		throw new AppError('dateTime must be in the future', 422);
	}

	const [therapistConflict, patientConflict] = await prisma.$transaction([
		prisma.therapySession.findFirst({
			where: {
				therapistProfileId: String(therapist.id),
				dateTime: input.dateTime,
				status: { in: PRISMA_ACTIVE_STATUSES },
			},
			select: { id: true, bookingReferenceId: true, status: true },
		}),
		prisma.therapySession.findFirst({
			where: {
				patientProfileId: String(patientProfile.id),
				dateTime: input.dateTime,
				status: { in: PRISMA_ACTIVE_STATUSES },
			},
			select: { id: true, bookingReferenceId: true, status: true },
		}),
	]);

	if (therapistConflict) {
		throw new AppError('Requested slot already booked for therapist', 409, {
			conflictType: 'therapist_slot_unavailable',
		});
	}

	if (patientConflict) {
		throw new AppError('You already have a booking for this dateTime', 409, {
			conflictType: 'patient_double_booking',
		});
	}

	const bookingReferenceId = buildBookingReferenceId();

	const session = await prisma.therapySession.create({
		data: {
			bookingReferenceId,
			patientProfileId: String(patientProfile.id),
			therapistProfileId: String(therapist.id),
			dateTime: input.dateTime,
			status: 'PENDING',
		},
	});

	await publishPlaceholderNotificationEvent({
		eventType: 'SESSION_BOOKING_CREATED',
		entityType: 'therapy_session',
		entityId: String(session.id),
		payload: {
			bookingReferenceId,
			patientId: String(patientProfile.id),
			therapistId: String(therapist.id),
			dateTime: input.dateTime.toISOString(),
			status: 'pending',
		},
	});

	return {
		sessionId: String(session.id),
		bookingReferenceId,
		status: String(session.status).toLowerCase(),
		dateTime: session.dateTime,
		therapist: {
			id: String(therapist.id),
			displayName:
				String(therapist.name ?? '').trim() ||
				`${String(therapist.firstName ?? '').trim()} ${String(therapist.lastName ?? '').trim()}`.trim() ||
				'Therapist',
		},
	};
};

export const getMySessionHistory = async (userId: string, query: SessionHistoryQuery) => {
	const patientProfile = await db.patientProfile.findUnique({ where: { userId }, select: { id: true } });
	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

	const pagination = normalizePagination(
		{ page: query.page, limit: query.limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const filter: {
		patientId: string;
		status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
	} = {
		patientId: patientProfile.id,
	};

	if (query.status) {
		filter.status = query.status;
	}

	const now = new Date();

	const prismaFilter: any = { patientProfileId: String(patientProfile.id) };
	if (filter.status) prismaFilter.status = String(filter.status).toUpperCase();

	const [totalItems, sessions, pastCount, upcomingCount] = await Promise.all([
		prisma.therapySession.count({ where: prismaFilter }),
		prisma.therapySession.findMany({
			where: prismaFilter,
			select: { id: true, bookingReferenceId: true, therapistProfileId: true, dateTime: true, status: true, createdAt: true },
			orderBy: { dateTime: 'desc' },
			skip: pagination.skip,
			take: pagination.limit,
		}),
		prisma.therapySession.count({ where: { ...prismaFilter, dateTime: { lt: now } } }),
		prisma.therapySession.count({ where: { ...prismaFilter, dateTime: { gte: now } } }),
	]);

	const therapistIds = [...new Set(sessions.map((session) => String(session.therapistProfileId)))];

	const therapistUsers = await db.user.findMany({
		where: { id: { in: therapistIds } },
		select: { id: true, name: true, firstName: true, lastName: true },
	});

	const therapistMap = new Map<string, any>(therapistUsers.map((therapist: any) => [String(therapist.id), therapist]));

	const items = sessions.map((session: any) => {
		const therapist = therapistMap.get(String(session.therapistProfileId)) as any;
		const sessionDate = new Date(session.dateTime);

		return {
			sessionId: String(session.id),
			bookingReferenceId: session.bookingReferenceId,
			dateTime: sessionDate,
			status: String(session.status).toLowerCase(),
			timing: sessionDate < now ? 'past' : 'upcoming',
			therapist: {
				id: String(session.therapistProfileId),
				name:
					String(therapist?.name ?? '').trim() ||
					`${String(therapist?.firstName ?? '').trim()} ${String(therapist?.lastName ?? '').trim()}`.trim() ||
					'Unknown Therapist',
				specializations: [],
			},
			bookedAt: session.createdAt,
		};
	});

	return {
		items,
		summary: {
			pastCount,
			upcomingCount,
			totalCount: totalItems,
		},
		meta: buildPaginationMeta(totalItems, pagination),
	};
};

const assertTherapistUser = async (userId: string): Promise<void> => {
	const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isDeleted: true } });

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (user.isDeleted) {
		throw new AppError('User account is deleted', 410);
	}

	if (String(user.role) !== 'THERAPIST') {
		throw new AppError('Therapist role required', 403);
	}
};

export const getMyTherapistSessions = async (userId: string, query: TherapistSessionHistoryQuery) => {
	await assertTherapistUser(userId);
	const therapistProfileId = userId;

	const pagination = normalizePagination(
		{ page: query.page, limit: query.limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const filter: Record<string, unknown> = {
		therapistId: therapistProfileId,
	};

	// status filter
	if (query.status) {
		filter.status = query.status;
	}

	// completion filter (if provided and status not explicitly set)
	if (query.completion && !query.status) {
		if (query.completion === 'complete') {
			filter.status = 'completed';
		} else if (query.completion === 'incomplete') {
			filter.status = { $ne: 'completed' };
		}
	}

	// date range filter
	if (query.from || query.to) {
		const range: Record<string, unknown> = {};
		if (query.from) {
			const d = new Date(query.from);
			if (!Number.isNaN(d.getTime())) range.$gte = d;
		}
		if (query.to) {
			const d = new Date(query.to);
			if (!Number.isNaN(d.getTime())) range.$lte = d;
		}
		if (Object.keys(range).length) {
			filter.dateTime = range;
		}
	}

	const now = new Date();

	// patient search: if provided, resolve matching patientIds via User -> PatientProfile
	if (query.patient) {
		const matchedUsers = await db.user.findMany({
			where: {
				OR: [
					{ name: { contains: query.patient, mode: 'insensitive' } },
					{ email: { contains: query.patient, mode: 'insensitive' } },
				],
			},
			select: { id: true },
		});
		const userIds = matchedUsers.map((u: any) => u.id);
		if (userIds.length === 0) {
			return {
				items: [],
				summary: { pastCount: 0, upcomingCount: 0, totalCount: 0 },
				meta: buildPaginationMeta(0, pagination),
			};
		}

		const matchedPatients = await db.patientProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
		const patientIds = matchedPatients.map((p: any) => p.id);
		if (patientIds.length === 0) {
			return {
				items: [],
				summary: { pastCount: 0, upcomingCount: 0, totalCount: 0 },
				meta: buildPaginationMeta(0, pagination),
			};
		}

		filter.patientId = { $in: patientIds.map(String) };
	}

	// optional sessionType filter (if stored)
	if (query.type) {
		filter.sessionType = query.type;
	}

	const prismaFilter2: any = { therapistProfileId: String(therapistProfileId) };
	if (filter.status) prismaFilter2.status = String(filter.status).toUpperCase();
	if (filter.patientId) prismaFilter2.patientProfileId = filter.patientId;
	if (filter.dateTime) prismaFilter2.dateTime = filter.dateTime;

	const [totalItems, sessions, pastCount, upcomingCount] = await Promise.all([
		prisma.therapySession.count({ where: prismaFilter2 }),
		prisma.therapySession.findMany({
			where: prismaFilter2,
			select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true, createdAt: true },
			orderBy: { dateTime: 'desc' },
			skip: pagination.skip,
			take: pagination.limit,
		}),
		prisma.therapySession.count({ where: { ...prismaFilter2, dateTime: { lt: now } } }),
		prisma.therapySession.count({ where: { ...prismaFilter2, dateTime: { gte: now } } }),
	]);

	const patientIds = [...new Set(sessions.map((session) => String(session.patientProfileId)))];
	const patientProfiles = await db.patientProfile.findMany({
		where: { id: { in: patientIds } },
		select: { id: true, userId: true, age: true, gender: true },
	});

	const userIds = patientProfiles.map((p: any) => String(p.userId));
	const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, firstName: true, lastName: true } });

	const patientMap: Map<string, any> = new Map(patientProfiles.map((patient: any) => [String(patient.id), patient]));
	const userMap: Map<string, any> = new Map(users.map((u: any) => [String(u.id), u]));

	const items = sessions.map((session: any) => {
		const patient = patientMap.get(String(session.patientProfileId)) as any;
		const user = patient ? userMap.get(String(patient.userId)) as any : undefined;
		const sessionDate = new Date(session.dateTime);

		// Minimal patient footprint for dashboard list (no PII)
		const displayName =
			String(user?.name ?? '').trim() ||
			`${String(user?.firstName ?? '').trim()} ${String(user?.lastName ?? '').trim()}`.trim();
		const initials = displayName ? displayName.split(' ').map((p: string) => p.charAt(0)).join('.') : null;

		return {
			sessionId: String(session.id),
			bookingReferenceId: session.bookingReferenceId,
			dateTime: sessionDate,
			status: String(session.status).toLowerCase(),
			timing: sessionDate < now ? 'past' : 'upcoming',
			patient: {
				id: String(session.patientProfileId),
				initials: initials || null,
				ageRange: patient?.age ? `${Math.floor(patient.age / 10) * 10}-${Math.floor(patient.age / 10) * 10 + 9}` : null,
			},
			bookedAt: session.createdAt,
		};
	});

	// Merge presence info (best-effort) from Redis for sessions and patients in this page
	try {
		const REDIS_URL = process.env.REDIS_URL || env.redisUrl || 'redis://127.0.0.1:6379';
		const r = createClient({ url: REDIS_URL });
		await r.connect();
		const sessionKeys = sessions.map((s) => `session:presence:${String(s.id)}`);
		const patientKeys = patientIds.map((p) => `user:presence:${String(p)}`);
		const pipelineKeys = [...sessionKeys, ...patientKeys];
		const results = await r.mGet(pipelineKeys);
		await r.disconnect();

		const sessionPresenceMap = new Map<string, boolean>();
		const patientPresenceMap = new Map<string, boolean>();

		for (let i = 0; i < sessionKeys.length; i++) {
			const v = results[i];
			sessionPresenceMap.set(String(sessions[i].id), !!v);
		}
		for (let i = 0; i < patientKeys.length; i++) {
			const v = results[sessionKeys.length + i];
			patientPresenceMap.set(String(patientIds[i]), !!v);
		}

		// attach presence flags
		for (const it of items) {
			it.presence = { patientOnline: !!patientPresenceMap.get(it.patient.id), sessionActive: !!sessionPresenceMap.get(it.sessionId) };
		}
	} catch (e) {
		// ignore presence failures
	}

	return {
		items,
		summary: {
			pastCount,
			upcomingCount,
			totalCount: totalItems,
		},
		meta: buildPaginationMeta(totalItems, pagination),
	};
};

export const getMyTherapistSessionDetail = async (userId: string, sessionId: string) => {
	await assertTherapistUser(userId);
	const therapistProfileId = userId;

	const session = await prisma.therapySession.findFirst({
		where: { id: sessionId, therapistProfileId: therapistProfileId },
		select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true, createdAt: true, cancelledAt: true },
	});

	if (!session) throw new AppError('Session not found', 404);

	// patient profile and user
	const patientProfile = await db.patientProfile.findUnique({
		where: { id: String(session.patientProfileId) },
		select: { id: true, userId: true, age: true, gender: true },
	});
	const user = patientProfile
		? await db.user.findUnique({
				where: { id: String(patientProfile.userId) },
				select: { name: true, email: true, firstName: true, lastName: true },
		  })
		: null;
	const patientName =
		String(user?.name ?? '').trim() ||
		`${String(user?.firstName ?? '').trim()} ${String(user?.lastName ?? '').trim()}`.trim() ||
		null;

	const responses = await prisma.patientSessionResponse.findMany({
		where: { sessionId: String(session.id) },
		orderBy: { answeredAt: 'asc' },
		select: {
			id: true,
			questionId: true,
			responseData: true,
			answeredAt: true,
		},
	});

	const branching = { nodes: {}, path: [] as string[] };

	const path = responses.map((r) => String(r.questionId));
	branching.path = path;

	const items = responses.map((r) => ({
		responseId: String(r.id),
		questionId: String(r.questionId),
		questionText: null,
		answer: r.responseData,
		timestamp: r.answeredAt,
		branchKey: null,
		nextQuestionId: null,
		flagged: false,
		flagReason: null,
	}));

	return {
		session: {
			id: String(session.id),
			bookingReferenceId: session.bookingReferenceId,
			dateTime: session.dateTime,
			status: String(session.status).toLowerCase(),
			completedAt: session.cancelledAt ?? null,
		},
		patient: {
			id: patientProfile?.id ? String(patientProfile.id) : null,
			name: patientName,
			email: user?.email ?? null,
			age: patientProfile?.age ?? null,
			gender: patientProfile?.gender ?? null,
		},
		timeline: items,
		branching,
		meta: { fetchedAt: new Date().toISOString() },
	};
};

export const updateMyTherapistSessionStatus = async (
	userId: string,
	sessionId: string,
	payload: TherapistSessionStatusPayload,
) => {
	await assertTherapistUser(userId);
	const therapistProfileId = userId;

	const session = await prisma.therapySession.findFirst({
		where: { id: sessionId, therapistProfileId: String(therapistProfileId) },
		select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true, cancelledAt: true, updatedAt: true },
	});

	if (!session) {
		throw new AppError('Session not found', 404);
	}

	if (String(session.status).toUpperCase() === String(payload.status).toUpperCase()) {
		return {
			sessionId: String(session.id),
			bookingReferenceId: session.bookingReferenceId,
			status: String(session.status).toLowerCase(),
			dateTime: session.dateTime,
			updatedAt: session.updatedAt,
		};
	}

	if (String(session.status).toUpperCase() === 'CANCELLED' || String(session.status).toUpperCase() === 'COMPLETED') {
		throw new AppError('Session status cannot be updated once cancelled or completed', 409, {
			conflictType: 'session_status_finalized',
		});
	}

	if (payload.status === 'confirmed' && String(session.status).toUpperCase() !== 'PENDING') {
		throw new AppError('Only pending sessions can be confirmed', 409, {
			conflictType: 'invalid_status_transition',
		});
	}

	if (payload.status === 'completed' && String(session.status).toUpperCase() !== 'CONFIRMED') {
		throw new AppError('Only confirmed sessions can be completed', 409, {
			conflictType: 'invalid_status_transition',
		});
	}

	await prisma.therapySession.updateMany({
		where: { id: sessionId, therapistProfileId: String(therapistProfileId) },
		data: {
			status: String(payload.status).toUpperCase(),
			cancelledAt: payload.status === 'cancelled' ? new Date() : null,
		},
	});

	const updated = await prisma.therapySession.findFirst({
		where: { id: sessionId, therapistProfileId: String(therapistProfileId) },
		select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true, cancelledAt: true, updatedAt: true },
	});

	if (!updated) {
		throw new AppError('Session not found', 404);
	}

	// Invalidate analytics cache for therapist (best-effort)
	try {
		await analyticsService.invalidateCacheForTherapist(userId);
	} catch (e) {
		// ignore
	}

	return {
		sessionId: String(updated.id),
		bookingReferenceId: updated.bookingReferenceId,
		status: String(updated.status).toLowerCase(),
		dateTime: updated.dateTime,
		cancelledAt: updated.cancelledAt,
		updatedAt: updated.updatedAt,
	};
};

export const saveMyTherapistSessionNote = async (
	userId: string,
	sessionId: string,
	payload: TherapistSessionNotePayload,
) => {
	await assertTherapistUser(userId);
	const therapistProfileId = userId;

	const encrypted = encryptSessionNote(payload.content);
	const noteUpdatedAt = new Date();

	await prisma.therapySession.updateMany({
		where: { id: sessionId, therapistProfileId: String(therapistProfileId) },
		data: {
			noteEncryptedContent: encrypted.encryptedContent,
			noteIv: encrypted.iv,
			noteAuthTag: encrypted.authTag,
			noteUpdatedAt: noteUpdatedAt,
			noteUpdatedByTherapistId: String(therapistProfileId),
		},
	});

	const updated = await prisma.therapySession.findFirst({
		where: { id: sessionId, therapistProfileId: String(therapistProfileId) },
		select: { id: true, bookingReferenceId: true, dateTime: true, noteEncryptedContent: true, noteIv: true, noteAuthTag: true, noteUpdatedAt: true, updatedAt: true },
	});

	if (!updated) {
		throw new AppError('Session not found', 404);
	}

	return {
		sessionId: String(updated.id),
		bookingReferenceId: updated.bookingReferenceId,
		note: {
			encryptedContent: updated.noteEncryptedContent ?? null,
			iv: updated.noteIv ?? null,
			authTag: updated.noteAuthTag ?? null,
			updatedAt: updated.noteUpdatedAt ?? null,
		},
		updatedAt: updated.updatedAt,
	};
};

export const addResponseNote = async (
	userId: string,
	sessionId: string,
	responseId: string,
	content: string,
) => {
	void userId;
	void sessionId;
	void responseId;
	void content;
	throw new AppError('Response notes are unavailable until Prisma response-note models are introduced', 501);
};

export const listResponseNotes = async (userId: string, sessionId: string, responseId: string) => {
	void userId;
	void sessionId;
	void responseId;
	throw new AppError('Response notes are unavailable until Prisma response-note models are introduced', 501);
};

export const getResponseNoteDecrypted = async (userId: string, noteId: string) => {
	void userId;
	void noteId;
	throw new AppError('Response notes are unavailable until Prisma response-note models are introduced', 501);
};

export const updateResponseNote = async (userId: string, noteId: string, content: string) => {
	void userId;
	void noteId;
	void content;
	throw new AppError('Response notes are unavailable until Prisma response-note models are introduced', 501);
};

export const deleteResponseNote = async (userId: string, noteId: string) => {
	void userId;
	void noteId;
	throw new AppError('Response notes are unavailable until Prisma response-note models are introduced', 501);
};

export const getMyTherapistSessionNoteDecrypted = async (
	userId: string,
	sessionId: string,
): Promise<string> => {
	await assertTherapistUser(userId);
	const therapistProfileId = userId;

	const session = await prisma.therapySession.findFirst({ where: { id: sessionId, therapistProfileId: String(therapistProfileId) }, select: { noteEncryptedContent: true, noteIv: true, noteAuthTag: true } });

	if (!session) {
		throw new AppError('Session not found', 404);
	}

	if (!session.noteEncryptedContent || !session.noteIv || !session.noteAuthTag) {
		throw new AppError('Session note not found', 404);
	}

	return decryptSessionNote({
		encryptedContent: session.noteEncryptedContent,
		iv: session.noteIv,
		authTag: session.noteAuthTag,
	});
};

export const getMyTherapistEarnings = async (userId: string, query: TherapistEarningsQuery) => {
	void userId;
	void query;
	throw new AppError('Therapist earnings endpoint is unavailable until therapist pricing metadata is fully migrated to Prisma', 501);
};
