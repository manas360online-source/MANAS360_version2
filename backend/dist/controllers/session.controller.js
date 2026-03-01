"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportMyTherapistSessionController = exports.getMyTherapistSessionController = exports.getMyTherapistEarningsController = exports.deleteMyTherapistResponseNoteController = exports.putMyTherapistResponseNoteController = exports.getMyTherapistResponseNoteController = exports.listMyTherapistResponseNotesController = exports.postMyTherapistResponseNoteController = exports.postMyTherapistSessionNoteController = exports.patchMyTherapistSessionController = exports.getMyTherapistSessionsController = exports.getMySessionHistoryController = exports.bookMySessionController = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const session_service_1 = require("../services/session.service");
const session_service_2 = require("../services/session.service");
const db_1 = require("../config/db");
const export_worker_1 = require("../jobs/export.worker");
const getAuthUserId = (req) => {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    return userId;
};
const bookMySessionController = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!req.validatedBookSessionPayload) {
        throw new error_middleware_1.AppError('Invalid booking payload', 400);
    }
    const session = await (0, session_service_1.bookPatientSession)(userId, req.validatedBookSessionPayload);
    (0, response_1.sendSuccess)(res, session, 'Session booked successfully', 201);
};
exports.bookMySessionController = bookMySessionController;
const getMySessionHistoryController = async (req, res) => {
    const userId = getAuthUserId(req);
    const query = req.validatedPatientSessionHistoryQuery ?? { page: 1, limit: 10 };
    const history = await (0, session_service_1.getMySessionHistory)(userId, query);
    (0, response_1.sendSuccess)(res, history, 'Session history fetched');
};
exports.getMySessionHistoryController = getMySessionHistoryController;
const getMyTherapistSessionsController = async (req, res) => {
    const userId = getAuthUserId(req);
    const query = req.validatedTherapistSessionHistoryQuery ?? { page: 1, limit: 10 };
    const sessions = await (0, session_service_1.getMyTherapistSessions)(userId, query);
    (0, response_1.sendSuccess)(res, sessions, 'Therapist sessions fetched');
};
exports.getMyTherapistSessionsController = getMyTherapistSessionsController;
const patchMyTherapistSessionController = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!req.validatedTherapistSessionStatusPayload) {
        throw new error_middleware_1.AppError('Invalid session status payload', 400);
    }
    const updatedSession = await (0, session_service_1.updateMyTherapistSessionStatus)(userId, String(req.params.id), req.validatedTherapistSessionStatusPayload);
    (0, response_1.sendSuccess)(res, updatedSession, 'Therapist session updated');
};
exports.patchMyTherapistSessionController = patchMyTherapistSessionController;
const postMyTherapistSessionNoteController = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!req.validatedTherapistSessionNotePayload) {
        throw new error_middleware_1.AppError('Invalid session note payload', 400);
    }
    const result = await (0, session_service_1.saveMyTherapistSessionNote)(userId, String(req.params.id), req.validatedTherapistSessionNotePayload);
    (0, response_1.sendSuccess)(res, result, 'Session note saved');
};
exports.postMyTherapistSessionNoteController = postMyTherapistSessionNoteController;
const postMyTherapistResponseNoteController = async (req, res) => {
    const userId = getAuthUserId(req);
    const { content } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim())
        throw new error_middleware_1.AppError('Invalid note content', 400);
    const result = await (0, session_service_2.addResponseNote)(userId, String(req.params.id), String(req.params.responseId), content.trim());
    (0, response_1.sendSuccess)(res, result, 'Response note added', 201);
};
exports.postMyTherapistResponseNoteController = postMyTherapistResponseNoteController;
const listMyTherapistResponseNotesController = async (req, res) => {
    const userId = getAuthUserId(req);
    const notes = await (0, session_service_2.listResponseNotes)(userId, String(req.params.id), String(req.params.responseId));
    (0, response_1.sendSuccess)(res, { notes }, 'Response notes fetched');
};
exports.listMyTherapistResponseNotesController = listMyTherapistResponseNotesController;
const getMyTherapistResponseNoteController = async (req, res) => {
    const userId = getAuthUserId(req);
    const content = await (0, session_service_2.getResponseNoteDecrypted)(userId, String(req.params.noteId));
    (0, response_1.sendSuccess)(res, { note: { id: req.params.noteId, content } }, 'Response note fetched');
};
exports.getMyTherapistResponseNoteController = getMyTherapistResponseNoteController;
const putMyTherapistResponseNoteController = async (req, res) => {
    const userId = getAuthUserId(req);
    const { content } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim())
        throw new error_middleware_1.AppError('Invalid note content', 400);
    const result = await (0, session_service_2.updateResponseNote)(userId, String(req.params.noteId), content.trim());
    (0, response_1.sendSuccess)(res, result, 'Response note updated');
};
exports.putMyTherapistResponseNoteController = putMyTherapistResponseNoteController;
const deleteMyTherapistResponseNoteController = async (req, res) => {
    const userId = getAuthUserId(req);
    const result = await (0, session_service_2.deleteResponseNote)(userId, String(req.params.noteId));
    (0, response_1.sendSuccess)(res, result, 'Response note deleted');
};
exports.deleteMyTherapistResponseNoteController = deleteMyTherapistResponseNoteController;
const getMyTherapistEarningsController = async (req, res) => {
    const userId = getAuthUserId(req);
    const query = req.validatedTherapistEarningsQuery ?? { page: 1, limit: 10 };
    const earnings = await (0, session_service_1.getMyTherapistEarnings)(userId, query);
    (0, response_1.sendSuccess)(res, earnings, 'Therapist earnings fetched');
};
exports.getMyTherapistEarningsController = getMyTherapistEarningsController;
const getMyTherapistSessionController = async (req, res) => {
    const userId = getAuthUserId(req);
    const sessionId = String(req.params.id);
    const detail = await (0, session_service_1.getMyTherapistSessionDetail)(userId, sessionId);
    (0, response_1.sendSuccess)(res, detail, 'Therapist session detail fetched');
};
exports.getMyTherapistSessionController = getMyTherapistSessionController;
const exportMyTherapistSessionController = async (req, res) => {
    const userId = getAuthUserId(req);
    const sessionId = String(req.params.id);
    const format = String(req.query.format || 'csv').toLowerCase();
    try {
        // log export request for audit (best-effort)
        try {
            await db_1.prisma.exportLog.create({ data: { therapistId: userId, sessionId, exportType: format.toUpperCase(), ipAddress: req.ip, userAgent: req.headers['user-agent'] } });
        }
        catch (e) {
            console.warn('Failed to write export log', e);
        }
        // Enqueue background export job
        const job = await export_worker_1.exportQueue.add('export', { sessionId, format, requestorId: userId, uploadToS3: true }, { removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 } });
        // create a pending session export record mapped to the jobId (best-effort)
        try {
            await db_1.prisma.sessionExport.create({ data: { sessionId, jobId: String(job.id), format: format.toUpperCase(), fileName: '', filePath: '', status: 'PENDING' } });
        }
        catch (e) {
            console.warn('Failed to create sessionExport record for job', job.id, e);
        }
        res.status(202).json({ success: true, jobId: job.id, status: 'queued' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.exportMyTherapistSessionController = exportMyTherapistSessionController;
