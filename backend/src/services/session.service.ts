import { randomBytes } from 'crypto';
import { AppError } from '../middleware/error.middleware';
import PatientProfileModel from '../models/patient.model';
import TherapistProfileModel from '../models/therapist.model';
import { prisma } from '../config/db';
import { publishPlaceholderNotificationEvent } from './notification.service';
import { buildPaginationMeta, normalizePagination } from '../utils/pagination';
import UserModel from '../models/user.model';
import { decryptSessionNote, encryptSessionNote } from '../utils/encryption';
import { Types } from 'mongoose';
import SessionResponseNoteModel from '../models/session-response-note.model';
import { analyticsService } from './analytics.service';
import { createClient } from 'redis';
import { env } from '../config/env';

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

const assertTherapistAvailability = (
	availabilitySlots: Array<{
		dayOfWeek: number;
		startMinute: number;
		endMinute: number;
		isAvailable: boolean;
	}>,
	sessionDateTime: Date,
): void => {
	const dayOfWeek = sessionDateTime.getDay();
	const minuteOfDay = getSlotMinuteOfDay(sessionDateTime);

	const isAvailable = availabilitySlots.some(
		(slot) =>
			slot.isAvailable &&
			slot.dayOfWeek === dayOfWeek &&
			minuteOfDay >= slot.startMinute &&
			minuteOfDay < slot.endMinute,
	);

	if (!isAvailable) {
		throw new AppError('Therapist is not available at the requested dateTime', 409);
	}
};

export const bookPatientSession = async (userId: string, input: BookSessionInput) => {
	const patientProfile = await PatientProfileModel.findOne({ userId }).select({ _id: 1 }).lean() as any;
	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

    const therapist = await TherapistProfileModel.findById(input.therapistId)
		.select({
			_id: 1,
			displayName: 1,
			availabilitySlots: 1,
		})
        .lean() as any;

	if (!therapist) {
		throw new AppError('Therapist not found', 404);
	}

	const now = new Date();
	if (input.dateTime <= now) {
		throw new AppError('dateTime must be in the future', 422);
	}

	assertTherapistAvailability(therapist.availabilitySlots ?? [], input.dateTime);

	const [therapistConflict, patientConflict] = await prisma.$transaction([
		prisma.therapySession.findFirst({
			where: {
				therapistProfileId: String(therapist._id),
				dateTime: input.dateTime,
				status: { in: PRISMA_ACTIVE_STATUSES },
			},
			select: { id: true, bookingReferenceId: true, status: true },
		}),
		prisma.therapySession.findFirst({
			where: {
				patientProfileId: String(patientProfile._id),
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
			patientProfileId: String(patientProfile._id),
			therapistProfileId: String(therapist._id),
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
			patientId: String(patientProfile._id),
			therapistId: String(therapist._id),
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
			id: String(therapist._id),
			displayName: therapist.displayName,
		},
	};
};

export const getMySessionHistory = async (userId: string, query: SessionHistoryQuery) => {
	const patientProfile = await PatientProfileModel.findOne({ userId }).select({ _id: 1 }).lean() as any;
	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

	const pagination = normalizePagination(
		{ page: query.page, limit: query.limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const filter: {
		patientId: typeof patientProfile._id;
		status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
	} = {
		patientId: patientProfile._id,
	};

	if (query.status) {
		filter.status = query.status;
	}

	const now = new Date();

	const prismaFilter: any = { patientProfileId: String(patientProfile._id) };
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

	const therapistProfiles = await TherapistProfileModel.find({
		_id: { $in: therapistIds },
	})
		.select({ _id: 1, displayName: 1, specializations: 1 })
		.lean() as any;

	const therapistMap = new Map<string, any>(
		therapistProfiles.map((therapist: any) => [String(therapist._id), therapist]),
	);

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
				name: therapist?.displayName ?? 'Unknown Therapist',
				specializations: therapist?.specializations ?? [],
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
	const user = await UserModel.findById(userId).select('_id role isDeleted').lean();

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (user.isDeleted) {
		throw new AppError('User account is deleted', 410);
	}

	if (user.role !== 'therapist') {
		throw new AppError('Therapist role required', 403);
	}
};

export const getMyTherapistSessions = async (userId: string, query: TherapistSessionHistoryQuery) => {
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select({ _id: 1 }).lean() as any;
	if (!therapistProfile) {
		throw new AppError('Therapist profile not found. Please create profile first.', 404);
	}

	const pagination = normalizePagination(
		{ page: query.page, limit: query.limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const filter: Record<string, unknown> = {
		therapistId: therapistProfile._id,
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
		const regex = new RegExp(String(query.patient), 'i');
		const matchedUsers = (await (UserModel.find({ $or: [{ name: regex }, { email: regex }] }).select({ _id: 1 }) as any).lean()) as any;
		const userIds = (matchedUsers as any).map((u: any) => u._id);
		if (userIds.length === 0) {
			return {
				items: [],
				summary: { pastCount: 0, upcomingCount: 0, totalCount: 0 },
				meta: buildPaginationMeta(0, pagination),
			};
		}

		const matchedPatients = (await (PatientProfileModel.find({ userId: { $in: userIds } }).select({ _id: 1 }) as any).lean()) as any;
		const patientIds = (matchedPatients as any).map((p: any) => p._id);
		if (patientIds.length === 0) {
			return {
				items: [],
				summary: { pastCount: 0, upcomingCount: 0, totalCount: 0 },
				meta: buildPaginationMeta(0, pagination),
			};
		}

		filter.patientId = { $in: patientIds };
	}

	// optional sessionType filter (if stored)
	if (query.type) {
		filter.sessionType = query.type;
	}

	const prismaFilter2: any = { therapistProfileId: String(therapistProfile._id) };
	if (filter.status) prismaFilter2.status = String(filter.status).toUpperCase();

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
	const patientProfiles = (await (PatientProfileModel.find({ _id: { $in: patientIds } }).select({ _id: 1, userId: 1, age: 1, gender: 1 }) as any).lean()) as any;

	const userIds = (patientProfiles as any).map((p: any) => String(p.userId));
	const users = (await (UserModel.find({ _id: { $in: userIds } }).select({ _id: 1, name: 1, email: 1 }) as any).lean()) as any;

	const patientMap: Map<string, any> = new Map((patientProfiles as any).map((patient: any) => [String(patient._id), patient]));
	const userMap: Map<string, any> = new Map((users as any).map((u: any) => [String(u._id), u]));

	const items = sessions.map((session: any) => {
		const patient = patientMap.get(String(session.patientProfileId)) as any;
		const user = patient ? userMap.get(String(patient.userId)) as any : undefined;
		const sessionDate = new Date(session.dateTime);

		// Minimal patient footprint for dashboard list (no PII)
		const initials = user?.name ? user.name.split(' ').map((p: string) => p.charAt(0)).join('.') : null;

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
		const sessionKeys = sessions.map((s) => `session:presence:${String(s._id)}`);
		const patientKeys = patientIds.map((p) => `user:presence:${String(p)}`);
		const pipelineKeys = [...sessionKeys, ...patientKeys];
		const results = await r.mGet(pipelineKeys);
		await r.disconnect();

		const sessionPresenceMap = new Map<string, boolean>();
		const patientPresenceMap = new Map<string, boolean>();

		for (let i = 0; i < sessionKeys.length; i++) {
			const v = results[i];
			sessionPresenceMap.set(String(sessions[i]._id), !!v);
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

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select('_id').lean() as any;
	if (!therapistProfile) throw new AppError('Therapist profile not found', 404);

	const session = await prisma.therapySession.findFirst({
		where: { id: sessionId, therapistProfileId: therapistProfile._id },
		select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true, createdAt: true, cancelledAt: true },
	});

	if (!session) throw new AppError('Session not found', 404);

	// patient profile and user
	const patientProfile = await PatientProfileModel.findById(session.patientProfileId).select({ _id: 1, userId: 1, age: 1, gender: 1 }).lean() as any;
	const user = patientProfile ? await UserModel.findById(patientProfile.userId).select({ name: 1, email: 1 }).lean() : null;

	// responses / timeline - try Prisma patientSessionResponse (CBT) first, fall back to any mongoose model
	let responses: any[] = [];
	try {
		const { prisma } = require('../config/db');
		if (prisma && typeof prisma.patientSessionResponse?.findMany === 'function') {
			const rows = await prisma.patientSessionResponse.findMany({ where: { sessionId: String(session.id) }, orderBy: { answeredAt: 'asc' } });
			responses = rows.map((r: any) => ({ _id: r.id, questionId: r.questionId, questionText: r.question?.prompt ?? null, answer: r.responseData, createdAt: r.answeredAt, branchKey: r.branchKey ?? null, nextQuestionId: r.nextQuestionId ?? null, flagged: r.flagged ?? false, flagReason: r.flagReason ?? null }));
		}
	} catch (e) {
		// ignore and try mongoose below
	}

	if (!responses.length) {
		try {
			const ResponseModel = require('../models/session-response.model').default;
			responses = await ResponseModel.find({ sessionId: session.id })
				.select({ _id: 1, questionId: 1, questionText: 1, answer: 1, createdAt: 1, branchKey: 1, nextQuestionId: 1, flagged: 1, flagReason: 1 })
				.sort({ createdAt: 1 })
				.lean();
		} catch (e) {
			// no response model available; responses remain empty
			responses = [];
		}
	}

	// build branching nodes minimal map if question templates available
	let branching = { nodes: {}, path: [] as string[] };
	try {
		const templateModel = require('../models/session-template.model').default;
		// if template is linked in session, try to fetch question graph (best-effort)
		const template = await templateModel.findOne({ sessions: session.id }).select({ _id: 1, questions: 1 }).lean();
		if (template && Array.isArray(template.questions)) {
			const nodes: Record<string, any> = {};
			template.questions.forEach((q: any) => {
				nodes[q._id] = { choices: q.choices ?? [] };
			});
			branching.nodes = nodes;
		}
	} catch (e) {
		// ignore if templates not present
	}

	const path = responses.map((r: any) => String(r.questionId));
	branching.path = path;

	const items = responses.map((r: any) => ({
		responseId: String(r._id),
		questionId: String(r.questionId),
		questionText: r.questionText ?? null,
		answer: r.answer,
		timestamp: r.createdAt,
		branchKey: r.branchKey ?? null,
		nextQuestionId: r.nextQuestionId ?? null,
		flagged: !!r.flagged,
		flagReason: r.flagReason ?? null,
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
			id: patientProfile?._id ? String(patientProfile._id) : null,
			name: user?.name ?? null,
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

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select('_id').lean() as any;
	if (!therapistProfile) {
		throw new AppError('Therapist profile not found. Please create profile first.', 404);
	}

	const session = await prisma.therapySession.findFirst({
		where: { id: sessionId, therapistProfileId: String(therapistProfile._id) },
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
		where: { id: sessionId, therapistProfileId: String(therapistProfile._id) },
		data: {
			status: String(payload.status).toUpperCase(),
			cancelledAt: payload.status === 'cancelled' ? new Date() : null,
		},
	});

	const updated = await prisma.therapySession.findFirst({
		where: { id: sessionId, therapistProfileId: String(therapistProfile._id) },
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

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select('_id').lean() as any;
	if (!therapistProfile) {
		throw new AppError('Therapist profile not found. Please create profile first.', 404);
	}

	const encrypted = encryptSessionNote(payload.content);
	const noteUpdatedAt = new Date();

	await prisma.therapySession.updateMany({
		where: { id: sessionId, therapistProfileId: String(therapistProfile._id) },
		data: {
			noteEncryptedContent: encrypted.encryptedContent,
			noteIv: encrypted.iv,
			noteAuthTag: encrypted.authTag,
			noteUpdatedAt: noteUpdatedAt,
			noteUpdatedByTherapistId: String(therapistProfile._id),
		},
	});

	const updated = await prisma.therapySession.findFirst({
		where: { id: sessionId, therapistProfileId: String(therapistProfile._id) },
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
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select('_id').lean() as any;
	if (!therapistProfile) throw new AppError('Therapist profile not found', 404);

	// ensure therapist owns the therapy session
	const session = await prisma.therapySession.findFirst({ where: { id: sessionId, therapistProfileId: String(therapistProfile._id) }, select: { id: true } });
	if (!session) throw new AppError('Session not found', 404);

	const encrypted = encryptSessionNote(content);

	const created = await SessionResponseNoteModel.create({
		sessionId,
		responseId,
		therapistId: therapistProfile._id,
		encryptedContent: encrypted.encryptedContent,
		iv: encrypted.iv,
		authTag: encrypted.authTag,
	});

	return {
		id: String(created._id),
		sessionId: created.sessionId,
		responseId: created.responseId,
		createdAt: created.createdAt,
		updatedAt: created.updatedAt,
	};
};

export const listResponseNotes = async (userId: string, sessionId: string, responseId: string) => {
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select('_id').lean() as any;
	if (!therapistProfile) throw new AppError('Therapist profile not found', 404);

	const notes = await SessionResponseNoteModel.find({ sessionId, responseId, therapistId: therapistProfile._id })
		.select({ _id: 1, sessionId: 1, responseId: 1, createdAt: 1, updatedAt: 1 })
		.sort({ createdAt: -1 })
		.lean();

	return notes.map((n) => ({ id: String(n._id), sessionId: n.sessionId, responseId: n.responseId, createdAt: n.createdAt, updatedAt: n.updatedAt }));
};

export const getResponseNoteDecrypted = async (userId: string, noteId: string) => {
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select('_id').lean() as any;
	if (!therapistProfile) throw new AppError('Therapist profile not found', 404);

	const note = await SessionResponseNoteModel.findById(noteId).lean();
	if (!note) throw new AppError('Note not found', 404);

	if (String(note.therapistId) !== String(therapistProfile._id)) {
		throw new AppError('Forbidden', 403);
	}

	return decryptSessionNote({ encryptedContent: note.encryptedContent, iv: note.iv, authTag: note.authTag });
};

export const updateResponseNote = async (userId: string, noteId: string, content: string) => {
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select('_id').lean() as any;
	if (!therapistProfile) throw new AppError('Therapist profile not found', 404);

	const note = await SessionResponseNoteModel.findById(noteId);
	if (!note) throw new AppError('Note not found', 404);

	if (String(note.therapistId) !== String(therapistProfile._id)) {
		throw new AppError('Forbidden', 403);
	}

	const encrypted = encryptSessionNote(content);
	note.encryptedContent = encrypted.encryptedContent;
	note.iv = encrypted.iv;
	note.authTag = encrypted.authTag;
	await note.save();

	return { id: String(note._id), updatedAt: note.updatedAt };
};

export const deleteResponseNote = async (userId: string, noteId: string) => {
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select('_id').lean() as any;
	if (!therapistProfile) throw new AppError('Therapist profile not found', 404);

	const note = await SessionResponseNoteModel.findById(noteId).lean();
	if (!note) throw new AppError('Note not found', 404);
	if (String(note.therapistId) !== String(therapistProfile._id)) throw new AppError('Forbidden', 403);

	await SessionResponseNoteModel.deleteOne({ _id: noteId });
	return { success: true };
};

export const getMyTherapistSessionNoteDecrypted = async (
	userId: string,
	sessionId: string,
): Promise<string> => {
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select('_id').lean() as any;
	if (!therapistProfile) {
		throw new AppError('Therapist profile not found. Please create profile first.', 404);
	}

	const session = await prisma.therapySession.findFirst({ where: { id: sessionId, therapistProfileId: String(therapistProfile._id) }, select: { noteEncryptedContent: true, noteIv: true, noteAuthTag: true } });

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
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId })
		.select({ _id: 1, consultationFee: 1, currency: 1 })
		.lean();

	if (!therapistProfile) {
		throw new AppError('Therapist profile not found. Please create profile first.', 404);
	}

	const pagination = normalizePagination(
		{ page: query.page, limit: query.limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const earningsPerSession = therapistProfile.consultationFee ?? 0;

	const dateMatch: { $gte?: Date; $lte?: Date } = {};
	if (query.fromDate) {
		dateMatch.$gte = query.fromDate;
	}
	if (query.toDate) {
		dateMatch.$lte = query.toDate;
	}

	const baseMatch: {
		therapistId: Types.ObjectId;
		status: 'completed';
		dateTime?: { $gte?: Date; $lte?: Date };
	} = {
		therapistId: therapistProfile._id,
		status: 'completed',
	};

	if (query.fromDate || query.toDate) {
		baseMatch.dateTime = dateMatch;
	}

	const currentMonthStart = new Date();
	currentMonthStart.setDate(1);
	currentMonthStart.setHours(0, 0, 0, 0);

	const nextMonthStart = new Date(currentMonthStart);
	nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

	const baseWhere: any = { therapistProfileId: String(therapistProfile._id), status: 'COMPLETED' };
	if (query.fromDate) baseWhere.dateTime = { ...(baseWhere.dateTime ?? {}), gte: query.fromDate };
	if (query.toDate) baseWhere.dateTime = { ...(baseWhere.dateTime ?? {}), lte: query.toDate };

	const [totalCompletedSessions, historyRows, monthlyCountResult] = await Promise.all([
		prisma.therapySession.count({ where: baseWhere }),
		prisma.therapySession.findMany({
			where: baseWhere,
			orderBy: { dateTime: 'desc' },
			skip: pagination.skip,
			take: pagination.limit,
			select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true, updatedAt: true },
		}),
		prisma.therapySession.count({ where: { therapistProfileId: String(therapistProfile._id), status: 'COMPLETED', dateTime: { gte: currentMonthStart, lt: nextMonthStart } } }),
	]);

	const aggregated = { totalCompletedSessions, totalEarnings: totalCompletedSessions * earningsPerSession, history: historyRows };

	const historyPatientIds = [...new Set((aggregated.history ?? []).map((item: any) => String(item.patientProfileId)))];
	const patientProfiles = (await (PatientProfileModel.find({ _id: { $in: historyPatientIds } }).select({ _id: 1, age: 1, gender: 1 }) as any).lean()) as any;
	const patientMap: Map<string, any> = new Map((patientProfiles as any).map((patient: any) => [String(patient._id), patient]));

	const historyItems = (aggregated.history ?? []).map((item: any) => {
		const patient = patientMap.get(String(item.patientProfileId));
		return {
			sessionId: String(item.id),
			bookingReferenceId: item.bookingReferenceId,
			dateTime: item.dateTime,
			earningAmount: earningsPerSession,
			status: String(item.status).toLowerCase(),
			patient: { id: String(item.patientProfileId), age: patient?.age ?? null, gender: patient?.gender ?? null },
			completedAt: item.updatedAt,
		};
	});

	return {
		summary: {
			totalEarnings: aggregated.totalEarnings,
			monthlyEarnings: monthlyCountResult * earningsPerSession,
			completedSessionCount: aggregated.totalCompletedSessions,
			currency: 'INR',
		},
		filters: {
			fromDate: query.fromDate ?? null,
			toDate: query.toDate ?? null,
		},
		history: {
			items: historyItems,
			meta: buildPaginationMeta(aggregated.totalCompletedSessions, pagination),
		},
	};
};
