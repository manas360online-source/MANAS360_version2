"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyTherapistEarnings = exports.getMyTherapistSessionNoteDecrypted = exports.deleteResponseNote = exports.updateResponseNote = exports.getResponseNoteDecrypted = exports.listResponseNotes = exports.addResponseNote = exports.saveMyTherapistSessionNote = exports.updateMyTherapistSessionStatus = exports.getMyTherapistSessionDetail = exports.getMyTherapistSessions = exports.getMySessionHistory = exports.bookPatientSession = void 0;
const crypto_1 = require("crypto");
const error_middleware_1 = require("../middleware/error.middleware");
const db_1 = require("../config/db");
const notification_service_1 = require("./notification.service");
const pagination_1 = require("../utils/pagination");
const encryption_1 = require("../utils/encryption");
const analytics_service_1 = require("./analytics.service");
const redis_1 = require("redis");
const env_1 = require("../config/env");
const db = db_1.prisma;
const ACTIVE_STATUSES = ['pending', 'confirmed'];
const PRISMA_ACTIVE_STATUSES = ACTIVE_STATUSES.map((s) => s.toUpperCase());
const buildBookingReferenceId = () => {
    const prefix = 'BK';
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = (0, crypto_1.randomBytes)(4).toString('hex').toUpperCase();
    return `${prefix}-${datePart}-${randomPart}`;
};
const getSlotMinuteOfDay = (date) => date.getHours() * 60 + date.getMinutes();
const bookPatientSession = async (userId, input) => {
    const patientProfile = await db.patientProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!patientProfile) {
        throw new error_middleware_1.AppError('Patient profile not found. Please create profile first.', 404);
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
        throw new error_middleware_1.AppError('Therapist not found', 404);
    }
    const now = new Date();
    if (input.dateTime <= now) {
        throw new error_middleware_1.AppError('dateTime must be in the future', 422);
    }
    const [therapistConflict, patientConflict] = await db_1.prisma.$transaction([
        db_1.prisma.therapySession.findFirst({
            where: {
                therapistProfileId: String(therapist.id),
                dateTime: input.dateTime,
                status: { in: PRISMA_ACTIVE_STATUSES },
            },
            select: { id: true, bookingReferenceId: true, status: true },
        }),
        db_1.prisma.therapySession.findFirst({
            where: {
                patientProfileId: String(patientProfile.id),
                dateTime: input.dateTime,
                status: { in: PRISMA_ACTIVE_STATUSES },
            },
            select: { id: true, bookingReferenceId: true, status: true },
        }),
    ]);
    if (therapistConflict) {
        throw new error_middleware_1.AppError('Requested slot already booked for therapist', 409, {
            conflictType: 'therapist_slot_unavailable',
        });
    }
    if (patientConflict) {
        throw new error_middleware_1.AppError('You already have a booking for this dateTime', 409, {
            conflictType: 'patient_double_booking',
        });
    }
    const bookingReferenceId = buildBookingReferenceId();
    const session = await db_1.prisma.therapySession.create({
        data: {
            bookingReferenceId,
            patientProfileId: String(patientProfile.id),
            therapistProfileId: String(therapist.id),
            dateTime: input.dateTime,
            status: 'PENDING',
        },
    });
    await (0, notification_service_1.publishPlaceholderNotificationEvent)({
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
            displayName: String(therapist.name ?? '').trim() ||
                `${String(therapist.firstName ?? '').trim()} ${String(therapist.lastName ?? '').trim()}`.trim() ||
                'Therapist',
        },
    };
};
exports.bookPatientSession = bookPatientSession;
const getMySessionHistory = async (userId, query) => {
    const patientProfile = await db.patientProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!patientProfile) {
        throw new error_middleware_1.AppError('Patient profile not found. Please create profile first.', 404);
    }
    const pagination = (0, pagination_1.normalizePagination)({ page: query.page, limit: query.limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    const filter = {
        patientId: patientProfile.id,
    };
    if (query.status) {
        filter.status = query.status;
    }
    const now = new Date();
    const prismaFilter = { patientProfileId: String(patientProfile.id) };
    if (filter.status)
        prismaFilter.status = String(filter.status).toUpperCase();
    const [totalItems, sessions, pastCount, upcomingCount] = await Promise.all([
        db_1.prisma.therapySession.count({ where: prismaFilter }),
        db_1.prisma.therapySession.findMany({
            where: prismaFilter,
            select: { id: true, bookingReferenceId: true, therapistProfileId: true, dateTime: true, status: true, createdAt: true },
            orderBy: { dateTime: 'desc' },
            skip: pagination.skip,
            take: pagination.limit,
        }),
        db_1.prisma.therapySession.count({ where: { ...prismaFilter, dateTime: { lt: now } } }),
        db_1.prisma.therapySession.count({ where: { ...prismaFilter, dateTime: { gte: now } } }),
    ]);
    const therapistIds = [...new Set(sessions.map((session) => String(session.therapistProfileId)))];
    const therapistUsers = await db.user.findMany({
        where: { id: { in: therapistIds } },
        select: { id: true, name: true, firstName: true, lastName: true },
    });
    const therapistMap = new Map(therapistUsers.map((therapist) => [String(therapist.id), therapist]));
    const items = sessions.map((session) => {
        const therapist = therapistMap.get(String(session.therapistProfileId));
        const sessionDate = new Date(session.dateTime);
        return {
            sessionId: String(session.id),
            bookingReferenceId: session.bookingReferenceId,
            dateTime: sessionDate,
            status: String(session.status).toLowerCase(),
            timing: sessionDate < now ? 'past' : 'upcoming',
            therapist: {
                id: String(session.therapistProfileId),
                name: String(therapist?.name ?? '').trim() ||
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
        meta: (0, pagination_1.buildPaginationMeta)(totalItems, pagination),
    };
};
exports.getMySessionHistory = getMySessionHistory;
const assertTherapistUser = async (userId) => {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isDeleted: true } });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    if (user.isDeleted) {
        throw new error_middleware_1.AppError('User account is deleted', 410);
    }
    if (String(user.role) !== 'THERAPIST') {
        throw new error_middleware_1.AppError('Therapist role required', 403);
    }
};
const getMyTherapistSessions = async (userId, query) => {
    await assertTherapistUser(userId);
    const therapistProfileId = userId;
    const pagination = (0, pagination_1.normalizePagination)({ page: query.page, limit: query.limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    const prismaFilter2 = { therapistProfileId: String(therapistProfileId) };
    // status filter
    if (query.status) {
        prismaFilter2.status = String(query.status).toUpperCase();
    }
    // completion filter (if provided and status not explicitly set)
    if (query.completion && !query.status) {
        if (query.completion === 'complete') {
            prismaFilter2.status = 'COMPLETED';
        }
        else if (query.completion === 'incomplete') {
            prismaFilter2.status = { not: 'COMPLETED' };
        }
    }
    // date range filter
    if (query.from || query.to) {
        const range = {};
        if (query.from) {
            const d = new Date(query.from);
            if (!Number.isNaN(d.getTime()))
                range.gte = d;
        }
        if (query.to) {
            const d = new Date(query.to);
            if (!Number.isNaN(d.getTime()))
                range.lte = d;
        }
        if (Object.keys(range).length) {
            prismaFilter2.dateTime = range;
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
        const userIds = matchedUsers.map((u) => u.id);
        if (userIds.length === 0) {
            return {
                items: [],
                summary: { pastCount: 0, upcomingCount: 0, totalCount: 0 },
                meta: (0, pagination_1.buildPaginationMeta)(0, pagination),
            };
        }
        const matchedPatients = await db.patientProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
        const patientIds = matchedPatients.map((p) => p.id);
        if (patientIds.length === 0) {
            return {
                items: [],
                summary: { pastCount: 0, upcomingCount: 0, totalCount: 0 },
                meta: (0, pagination_1.buildPaginationMeta)(0, pagination),
            };
        }
        prismaFilter2.patientProfileId = { in: patientIds.map(String) };
    }
    // optional sessionType filter (if stored)
    if (query.type) {
        prismaFilter2.sessionType = query.type;
    }
    const [totalItems, sessions, pastCount, upcomingCount] = await Promise.all([
        db_1.prisma.therapySession.count({ where: prismaFilter2 }),
        db_1.prisma.therapySession.findMany({
            where: prismaFilter2,
            select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true, createdAt: true },
            orderBy: { dateTime: 'desc' },
            skip: pagination.skip,
            take: pagination.limit,
        }),
        db_1.prisma.therapySession.count({ where: { ...prismaFilter2, dateTime: { lt: now } } }),
        db_1.prisma.therapySession.count({ where: { ...prismaFilter2, dateTime: { gte: now } } }),
    ]);
    const patientIds = [...new Set(sessions.map((session) => String(session.patientProfileId)))];
    const patientProfiles = await db.patientProfile.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, userId: true, age: true, gender: true },
    });
    const userIds = patientProfiles.map((p) => String(p.userId));
    const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, firstName: true, lastName: true, showNameToProviders: true },
    });
    const patientMap = new Map(patientProfiles.map((patient) => [String(patient.id), patient]));
    const userMap = new Map(users.map((u) => [String(u.id), u]));
    const items = sessions.map((session) => {
        const patient = patientMap.get(String(session.patientProfileId));
        const user = patient ? userMap.get(String(patient.userId)) : undefined;
        const sessionDate = new Date(session.dateTime);
        // Minimal patient footprint for dashboard list (no PII)
        const isNameVisible = user?.showNameToProviders !== false;
        const resolvedName = String(user?.name ?? '').trim() ||
            `${String(user?.firstName ?? '').trim()} ${String(user?.lastName ?? '').trim()}`.trim();
        const displayName = isNameVisible ? resolvedName : 'Anonymous Patient';
        const initials = isNameVisible
            ? displayName
                ? displayName.split(' ').map((p) => p.charAt(0)).join('.')
                : null
            : 'A.P';
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
        const REDIS_URL = process.env.REDIS_URL || env_1.env.redisUrl || 'redis://127.0.0.1:6379';
        const r = (0, redis_1.createClient)({ url: REDIS_URL });
        await r.connect();
        const sessionKeys = sessions.map((s) => `session:presence:${String(s.id)}`);
        const patientKeys = patientIds.map((p) => `user:presence:${String(p)}`);
        const pipelineKeys = [...sessionKeys, ...patientKeys];
        const results = await r.mGet(pipelineKeys);
        await r.disconnect();
        const sessionPresenceMap = new Map();
        const patientPresenceMap = new Map();
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
    }
    catch (e) {
        // ignore presence failures
    }
    return {
        items,
        summary: {
            pastCount,
            upcomingCount,
            totalCount: totalItems,
        },
        meta: (0, pagination_1.buildPaginationMeta)(totalItems, pagination),
    };
};
exports.getMyTherapistSessions = getMyTherapistSessions;
const getMyTherapistSessionDetail = async (userId, sessionId) => {
    await assertTherapistUser(userId);
    const therapistProfileId = userId;
    const session = await db_1.prisma.therapySession.findFirst({
        where: { id: sessionId, therapistProfileId: therapistProfileId },
        select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true, createdAt: true, cancelledAt: true },
    });
    if (!session)
        throw new error_middleware_1.AppError('Session not found', 404);
    // patient profile and user
    const patientProfile = await db.patientProfile.findUnique({
        where: { id: String(session.patientProfileId) },
        select: { id: true, userId: true, age: true, gender: true },
    });
    const user = patientProfile
        ? await db.user.findUnique({
            where: { id: String(patientProfile.userId) },
            select: { name: true, email: true, firstName: true, lastName: true, showNameToProviders: true },
        })
        : null;
    const isNameVisible = user?.showNameToProviders !== false;
    const patientName = isNameVisible
        ? String(user?.name ?? '').trim() ||
            `${String(user?.firstName ?? '').trim()} ${String(user?.lastName ?? '').trim()}`.trim() ||
            null
        : 'Anonymous Patient';
    const responses = await db_1.prisma.patientSessionResponse.findMany({
        where: { sessionId: String(session.id) },
        orderBy: { answeredAt: 'asc' },
        select: {
            id: true,
            questionId: true,
            responseData: true,
            answeredAt: true,
        },
    });
    const branching = { nodes: {}, path: [] };
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
            email: isNameVisible ? user?.email ?? null : null,
            age: patientProfile?.age ?? null,
            gender: patientProfile?.gender ?? null,
        },
        timeline: items,
        branching,
        meta: { fetchedAt: new Date().toISOString() },
    };
};
exports.getMyTherapistSessionDetail = getMyTherapistSessionDetail;
const updateMyTherapistSessionStatus = async (userId, sessionId, payload) => {
    await assertTherapistUser(userId);
    const therapistProfileId = userId;
    const session = await db_1.prisma.therapySession.findFirst({
        where: { id: sessionId, therapistProfileId: String(therapistProfileId) },
        select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true, cancelledAt: true, updatedAt: true },
    });
    if (!session) {
        throw new error_middleware_1.AppError('Session not found', 404);
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
        throw new error_middleware_1.AppError('Session status cannot be updated once cancelled or completed', 409, {
            conflictType: 'session_status_finalized',
        });
    }
    if (payload.status === 'confirmed' && String(session.status).toUpperCase() !== 'PENDING') {
        throw new error_middleware_1.AppError('Only pending sessions can be confirmed', 409, {
            conflictType: 'invalid_status_transition',
        });
    }
    if (payload.status === 'completed' && String(session.status).toUpperCase() !== 'CONFIRMED') {
        throw new error_middleware_1.AppError('Only confirmed sessions can be completed', 409, {
            conflictType: 'invalid_status_transition',
        });
    }
    await db_1.prisma.therapySession.updateMany({
        where: { id: sessionId, therapistProfileId: String(therapistProfileId) },
        data: {
            status: String(payload.status).toUpperCase(),
            cancelledAt: payload.status === 'cancelled' ? new Date() : null,
        },
    });
    const updated = await db_1.prisma.therapySession.findFirst({
        where: { id: sessionId, therapistProfileId: String(therapistProfileId) },
        select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true, cancelledAt: true, updatedAt: true },
    });
    if (!updated) {
        throw new error_middleware_1.AppError('Session not found', 404);
    }
    // Invalidate analytics cache for therapist (best-effort)
    try {
        await analytics_service_1.analyticsService.invalidateCacheForTherapist(userId);
    }
    catch (e) {
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
exports.updateMyTherapistSessionStatus = updateMyTherapistSessionStatus;
const saveMyTherapistSessionNote = async (userId, sessionId, payload) => {
    await assertTherapistUser(userId);
    const therapistProfileId = userId;
    const encrypted = (0, encryption_1.encryptSessionNote)(payload.content);
    const noteUpdatedAt = new Date();
    await db_1.prisma.therapySession.updateMany({
        where: { id: sessionId, therapistProfileId: String(therapistProfileId) },
        data: {
            noteEncryptedContent: encrypted.encryptedContent,
            noteIv: encrypted.iv,
            noteAuthTag: encrypted.authTag,
            noteUpdatedAt: noteUpdatedAt,
            noteUpdatedByTherapistId: String(therapistProfileId),
        },
    });
    const updated = await db_1.prisma.therapySession.findFirst({
        where: { id: sessionId, therapistProfileId: String(therapistProfileId) },
        select: { id: true, bookingReferenceId: true, dateTime: true, noteEncryptedContent: true, noteIv: true, noteAuthTag: true, noteUpdatedAt: true, updatedAt: true },
    });
    if (!updated) {
        throw new error_middleware_1.AppError('Session not found', 404);
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
exports.saveMyTherapistSessionNote = saveMyTherapistSessionNote;
const addResponseNote = async (userId, sessionId, responseId, content) => {
    void userId;
    void sessionId;
    void responseId;
    void content;
    throw new error_middleware_1.AppError('Response notes are unavailable until Prisma response-note models are introduced', 501);
};
exports.addResponseNote = addResponseNote;
const listResponseNotes = async (userId, sessionId, responseId) => {
    void userId;
    void sessionId;
    void responseId;
    throw new error_middleware_1.AppError('Response notes are unavailable until Prisma response-note models are introduced', 501);
};
exports.listResponseNotes = listResponseNotes;
const getResponseNoteDecrypted = async (userId, noteId) => {
    void userId;
    void noteId;
    throw new error_middleware_1.AppError('Response notes are unavailable until Prisma response-note models are introduced', 501);
};
exports.getResponseNoteDecrypted = getResponseNoteDecrypted;
const updateResponseNote = async (userId, noteId, content) => {
    void userId;
    void noteId;
    void content;
    throw new error_middleware_1.AppError('Response notes are unavailable until Prisma response-note models are introduced', 501);
};
exports.updateResponseNote = updateResponseNote;
const deleteResponseNote = async (userId, noteId) => {
    void userId;
    void noteId;
    throw new error_middleware_1.AppError('Response notes are unavailable until Prisma response-note models are introduced', 501);
};
exports.deleteResponseNote = deleteResponseNote;
const getMyTherapistSessionNoteDecrypted = async (userId, sessionId) => {
    await assertTherapistUser(userId);
    const therapistProfileId = userId;
    const session = await db_1.prisma.therapySession.findFirst({ where: { id: sessionId, therapistProfileId: String(therapistProfileId) }, select: { noteEncryptedContent: true, noteIv: true, noteAuthTag: true } });
    if (!session) {
        throw new error_middleware_1.AppError('Session not found', 404);
    }
    if (!session.noteEncryptedContent || !session.noteIv || !session.noteAuthTag) {
        throw new error_middleware_1.AppError('Session note not found', 404);
    }
    return (0, encryption_1.decryptSessionNote)({
        encryptedContent: session.noteEncryptedContent,
        iv: session.noteIv,
        authTag: session.noteAuthTag,
    });
};
exports.getMyTherapistSessionNoteDecrypted = getMyTherapistSessionNoteDecrypted;
const getMyTherapistEarnings = async (userId, query) => {
    await assertTherapistUser(userId);
    const now = new Date();
    const start = query.fromDate ? new Date(query.fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = query.toDate ? new Date(query.toDate) : now;
    const sessions = await db_1.prisma.therapySession.findMany({
        where: {
            therapistProfileId: String(userId),
            dateTime: { gte: start, lte: end },
            status: 'COMPLETED',
            paymentStatus: { in: ['PAID', 'CAPTURED'] },
        },
        orderBy: { dateTime: 'desc' },
        select: {
            id: true,
            dateTime: true,
            sessionFeeMinor: true,
            paymentStatus: true,
            bookingReferenceId: true,
        },
    });
    const toMinor = (value) => {
        if (typeof value === 'bigint')
            return Number(value);
        if (typeof value === 'number')
            return value;
        if (typeof value === 'string')
            return Number(value);
        return 0;
    };
    const grossMinor = sessions.reduce((sum, row) => sum + toMinor(row.sessionFeeMinor), 0);
    const therapistShareMinor = Math.round(grossMinor * 0.6);
    const platformShareMinor = Math.round(grossMinor * 0.4);
    const monthKeys = Array.from({ length: 6 }, (_, index) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        return {
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleDateString('en-US', { month: 'short' }),
        };
    });
    const chartMap = new Map();
    for (const mk of monthKeys)
        chartMap.set(mk.key, 0);
    for (const row of sessions) {
        const d = new Date(row.dateTime);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!chartMap.has(key))
            continue;
        chartMap.set(key, (chartMap.get(key) || 0) + toMinor(row.sessionFeeMinor));
    }
    return {
        summary: {
            fromDate: start,
            toDate: end,
            sessionsCompleted: sessions.length,
            grossMinor,
            therapistShareMinor,
            platformShareMinor,
        },
        chart: {
            labels: monthKeys.map((mk) => mk.label),
            therapistShare: monthKeys.map((mk) => Math.round((chartMap.get(mk.key) || 0) * 0.6)),
            platformShare: monthKeys.map((mk) => Math.round((chartMap.get(mk.key) || 0) * 0.4)),
        },
        items: sessions.map((row) => ({
            id: String(row.id),
            bookingReferenceId: row.bookingReferenceId,
            dateTime: row.dateTime,
            amountMinor: Math.round(toMinor(row.sessionFeeMinor) * 0.6),
            status: String(row.paymentStatus).toLowerCase(),
        })),
    };
};
exports.getMyTherapistEarnings = getMyTherapistEarnings;
