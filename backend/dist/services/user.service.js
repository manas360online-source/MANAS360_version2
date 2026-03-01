"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreDeletedUserAccount = exports.invalidateMySession = exports.listMyActiveSessions = exports.changeMyPassword = exports.uploadMyProfilePhoto = exports.softDeleteMyAccount = exports.updateMyProfile = exports.getMyProfile = void 0;
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const s3_service_1 = require("./s3.service");
const hash_1 = require("../utils/hash");
const db = db_1.prisma;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assertUserIsActive = async (userId) => {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, isDeleted: true },
    });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    if (user.isDeleted) {
        throw new error_middleware_1.AppError('User account is deleted', 410);
    }
};
const getMyProfile = async (userId) => {
    await assertUserIsActive(userId);
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            provider: true,
            emailVerified: true,
            phoneVerified: true,
            firstName: true,
            lastName: true,
            profileImageKey: true,
            profileImageUrl: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    return {
        ...user,
        role: String(user.role).toLowerCase(),
        provider: String(user.provider).toLowerCase(),
    };
};
exports.getMyProfile = getMyProfile;
const updateMyProfile = async (userId, payload) => {
    await assertUserIsActive(userId);
    const updatePayload = {};
    if (payload.name !== undefined) {
        updatePayload.name = payload.name;
    }
    if (payload.phone !== undefined) {
        const existingPhoneOwner = await db.user.findFirst({
            where: {
                phone: payload.phone,
                isDeleted: false,
                id: { not: userId },
            },
            select: { id: true },
        });
        if (existingPhoneOwner) {
            throw new error_middleware_1.AppError('Phone is already in use', 409);
        }
        updatePayload.phone = payload.phone;
    }
    if (Object.keys(updatePayload).length === 0) {
        throw new error_middleware_1.AppError('No allowed fields provided for update', 400);
    }
    const nameParts = (updatePayload.name ?? '').trim().split(/\s+/).filter(Boolean);
    const nextFirstName = updatePayload.name !== undefined ? nameParts.slice(0, 1).join(' ') : undefined;
    const nextLastName = updatePayload.name !== undefined ? nameParts.slice(1).join(' ') : undefined;
    const updatedUser = await db.user.updateMany({
        where: { id: userId, isDeleted: false },
        data: {
            ...(updatePayload.name !== undefined
                ? {
                    name: updatePayload.name,
                    firstName: nextFirstName ?? '',
                    lastName: nextLastName ?? '',
                }
                : {}),
            ...(updatePayload.phone !== undefined ? { phone: updatePayload.phone } : {}),
        },
    });
    if (updatedUser.count === 0) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    return (0, exports.getMyProfile)(userId);
};
exports.updateMyProfile = updateMyProfile;
const softDeleteMyAccount = async (userId) => {
    const updated = await db.user.updateMany({
        where: { id: userId, isDeleted: false },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
        },
    });
    await db.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (updated.count === 0) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
};
exports.softDeleteMyAccount = softDeleteMyAccount;
const uploadMyProfilePhoto = async (userId, file) => {
    await assertUserIsActive(userId);
    const existingUser = await db.user.findFirst({
        where: { id: userId, isDeleted: false },
        select: { id: true, profileImageKey: true },
    });
    if (!existingUser) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    const uploaded = await (0, s3_service_1.uploadProfilePhotoToS3)({
        userId,
        buffer: file.buffer,
        mimeType: file.mimetype,
    });
    if (existingUser.profileImageKey) {
        await (0, s3_service_1.deleteFileFromS3)(existingUser.profileImageKey);
    }
    const updated = await db.user.updateMany({
        where: { id: userId, isDeleted: false },
        data: {
            profileImageKey: uploaded.objectKey,
            profileImageUrl: uploaded.objectUrl,
        },
    });
    if (updated.count === 0) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    const signedProfileImageUrl = await (0, s3_service_1.getSignedProfilePhotoUrl)(uploaded.objectKey);
    return {
        ...(await (0, exports.getMyProfile)(userId)),
        signedProfileImageUrl,
    };
};
exports.uploadMyProfilePhoto = uploadMyProfilePhoto;
const changeMyPassword = async (userId, payload) => {
    await assertUserIsActive(userId);
    const user = await db.user.findFirst({
        where: { id: userId, isDeleted: false },
        select: { id: true, passwordHash: true },
    });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    if (!user.passwordHash) {
        throw new error_middleware_1.AppError('Password login is not enabled for this account', 400);
    }
    const currentPasswordMatches = await (0, hash_1.verifyPassword)(payload.currentPassword, user.passwordHash);
    if (!currentPasswordMatches) {
        throw new error_middleware_1.AppError('currentPassword is incorrect', 401);
    }
    const newMatchesCurrent = await (0, hash_1.verifyPassword)(payload.newPassword, user.passwordHash);
    if (newMatchesCurrent) {
        throw new error_middleware_1.AppError('newPassword must be different from currentPassword', 400);
    }
    const newPasswordHash = await (0, hash_1.hashPassword)(payload.newPassword);
    await db.user.updateMany({
        where: { id: userId, isDeleted: false },
        data: {
            passwordHash: newPasswordHash,
            passwordChangedAt: new Date(),
        },
    });
    await db.authSession.updateMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { revokedAt: new Date() },
    });
};
exports.changeMyPassword = changeMyPassword;
const listMyActiveSessions = async (userId, currentSessionId) => {
    await assertUserIsActive(userId);
    const sessions = await db.authSession.findMany({
        where: {
            userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
    });
    return sessions.map((session) => ({
        id: String(session.id),
        device: session.device,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        isCurrent: currentSessionId ? String(session.id) === currentSessionId : false,
    }));
};
exports.listMyActiveSessions = listMyActiveSessions;
const invalidateMySession = async (userId, sessionId) => {
    await assertUserIsActive(userId);
    if (!uuidRegex.test(sessionId)) {
        throw new error_middleware_1.AppError('Invalid session id', 400);
    }
    const session = await db.authSession.findFirst({
        where: {
            id: sessionId,
            userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
        },
    });
    if (!session) {
        throw new error_middleware_1.AppError('Session not found', 404);
    }
    await db.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
};
exports.invalidateMySession = invalidateMySession;
const restoreDeletedUserAccount = async (userId) => {
    const restored = await db.user.updateMany({
        where: { id: userId, isDeleted: true },
        data: {
            isDeleted: false,
            deletedAt: null,
        },
    });
    if (restored.count === 0) {
        throw new error_middleware_1.AppError('Deleted user not found', 404);
    }
    return (0, exports.getMyProfile)(userId);
};
exports.restoreDeletedUserAccount = restoreDeletedUserAccount;
