"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMySessionsController = exports.deleteMySessionController = exports.getMySessionsController = exports.patchMePasswordController = exports.uploadMePhotoController = exports.deleteMeController = exports.patchMeController = exports.getMeController = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const user_service_1 = require("../services/user.service");
const response_1 = require("../utils/response");
const getAuthUserId = (req) => {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    return userId;
};
const getMeController = async (req, res) => {
    const userId = getAuthUserId(req);
    const profile = await (0, user_service_1.getMyProfile)(userId);
    (0, response_1.sendSuccess)(res, profile, 'Profile fetched');
};
exports.getMeController = getMeController;
const patchMeController = async (req, res) => {
    const userId = getAuthUserId(req);
    const validatedPayload = req.validatedUserUpdate;
    if (!validatedPayload) {
        throw new error_middleware_1.AppError('Invalid update payload', 400);
    }
    const updatedProfile = await (0, user_service_1.updateMyProfile)(userId, validatedPayload);
    (0, response_1.sendSuccess)(res, updatedProfile, 'Profile updated');
};
exports.patchMeController = patchMeController;
const deleteMeController = async (req, res) => {
    const userId = getAuthUserId(req);
    await (0, user_service_1.softDeleteMyAccount)(userId);
    (0, response_1.sendSuccess)(res, null, 'Account deleted');
};
exports.deleteMeController = deleteMeController;
const uploadMePhotoController = async (req, res) => {
    const userId = getAuthUserId(req);
    if (!req.file) {
        throw new error_middleware_1.AppError('Profile photo file is required', 400);
    }
    const updatedProfile = await (0, user_service_1.uploadMyProfilePhoto)(userId, {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
    });
    (0, response_1.sendSuccess)(res, updatedProfile, 'Profile photo updated');
};
exports.uploadMePhotoController = uploadMePhotoController;
const patchMePasswordController = async (req, res) => {
    const userId = getAuthUserId(req);
    const validatedPayload = req.validatedChangePassword;
    if (!validatedPayload) {
        throw new error_middleware_1.AppError('Invalid password payload', 400);
    }
    await (0, user_service_1.changeMyPassword)(userId, validatedPayload);
    (0, response_1.sendSuccess)(res, null, 'Password updated successfully');
};
exports.patchMePasswordController = patchMePasswordController;
const getMySessionsController = async (req, res) => {
    const userId = getAuthUserId(req);
    const sessions = await (0, user_service_1.listMyActiveSessions)(userId, req.auth?.sessionId);
    (0, response_1.sendSuccess)(res, sessions, 'Active sessions fetched');
};
exports.getMySessionsController = getMySessionsController;
const deleteMySessionController = async (req, res) => {
    const userId = getAuthUserId(req);
    await (0, user_service_1.invalidateMySession)(userId, String(req.params.id));
    (0, response_1.sendSuccess)(res, null, 'Session invalidated successfully');
};
exports.deleteMySessionController = deleteMySessionController;
const deleteMySessionsController = async (req, res) => {
    const userId = getAuthUserId(req);
    const result = await (0, user_service_1.invalidateAllMySessions)(userId);
    (0, response_1.sendSuccess)(res, result, 'All sessions invalidated successfully');
};
exports.deleteMySessionsController = deleteMySessionsController;
