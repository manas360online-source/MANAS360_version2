"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSession = exports.getActiveSessions = exports.verifyAndEnableMfa = exports.setupMfa = exports.resetPassword = exports.requestPasswordReset = exports.logoutSession = exports.refreshAuthTokens = exports.loginWithGoogle = exports.loginWithPassword = exports.verifyPhoneOtp = exports.registerWithPhone = exports.verifyEmailOtp = exports.registerWithEmail = void 0;
const crypto_1 = require("crypto");
const otplib_1 = require("otplib");
const google_auth_library_1 = require("google-auth-library");
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const hash_1 = require("../utils/hash");
const jwt_1 = require("../utils/jwt");
const googleClient = new google_auth_library_1.OAuth2Client(env_1.env.googleClientId);
const db = db_1.prisma;
const nowPlusMinutes = (minutes) => new Date(Date.now() + minutes * 60 * 1000);
const nowPlusDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const audit = async (event, status, meta, context = {}) => {
    await db.authAuditLog.create({
        data: {
            event,
            status,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            ...(context.userId ? { userId: String(context.userId) } : {}),
            email: typeof context.email === 'string' ? context.email : null,
            phone: typeof context.phone === 'string' ? context.phone : null,
            metadata: context,
        },
    });
};
const issueSessionTokens = async (userId, meta) => {
    const createdSession = await db.authSession.create({
        data: {
            userId,
            jti: (0, crypto_1.randomBytes)(24).toString('hex'),
            refreshTokenHash: (0, crypto_1.randomBytes)(24).toString('hex'),
            expiresAt: nowPlusDays(7),
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            device: meta.device,
        },
        select: { id: true },
    });
    const tokenPair = (0, jwt_1.createTokenPair)(userId, createdSession.id);
    const refreshTokenHash = (0, hash_1.hashOpaqueToken)(tokenPair.refreshToken);
    await db.authSession.update({
        where: { id: createdSession.id },
        data: {
            jti: tokenPair.refreshJti,
            refreshTokenHash,
        },
    });
    return tokenPair;
};
const registerWithEmail = async (input, meta) => {
    const existing = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
        if (existing.isDeleted) {
            throw new error_middleware_1.AppError('Account is deleted. Contact support to restore access.', 410);
        }
        throw new error_middleware_1.AppError('Email already registered', 409);
    }
    const passwordHash = await (0, hash_1.hashPassword)(input.password);
    const otp = (0, hash_1.generateNumericOtp)();
    const otpHash = await (0, hash_1.hashOtp)(otp);
    const user = await db.user.create({
        data: {
            email: input.email.toLowerCase(),
            passwordHash,
            emailVerificationOtpHash: otpHash,
            emailVerificationOtpExpiresAt: nowPlusMinutes(env_1.env.otpTtlMinutes),
            provider: 'LOCAL',
            role: 'PATIENT',
            name: input.name ?? null,
            firstName: input.name?.trim() || '',
            lastName: '',
        },
    });
    await audit('REGISTER_SUCCESS', 'success', meta, { userId: user._id, email: user.email });
    return {
        userId: String(user.id),
        email: user.email,
        message: 'Registration successful. Verify your email OTP.',
        devOtp: env_1.env.nodeEnv !== 'production' ? otp : undefined,
    };
};
exports.registerWithEmail = registerWithEmail;
const verifyEmailOtp = async (input) => {
    const user = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt) {
        throw new error_middleware_1.AppError('Invalid verification request', 400);
    }
    if (user.emailVerificationOtpExpiresAt < new Date()) {
        throw new error_middleware_1.AppError('OTP expired', 400);
    }
    const validOtp = await (0, hash_1.verifyOtp)(input.otp, user.emailVerificationOtpHash);
    if (!validOtp) {
        throw new error_middleware_1.AppError('Invalid OTP', 400);
    }
    await db.user.update({
        where: { id: user.id },
        data: {
            emailVerified: true,
            emailVerificationOtpHash: null,
            emailVerificationOtpExpiresAt: null,
        },
    });
};
exports.verifyEmailOtp = verifyEmailOtp;
const registerWithPhone = async (input) => {
    const existing = await db.user.findFirst({ where: { phone: input.phone } });
    if (existing) {
        if (existing.isDeleted) {
            throw new error_middleware_1.AppError('Account is deleted. Contact support to restore access.', 410);
        }
        throw new error_middleware_1.AppError('Phone already registered', 409);
    }
    const otp = (0, hash_1.generateNumericOtp)();
    const otpHash = await (0, hash_1.hashOtp)(otp);
    const user = await db.user.create({
        data: {
            phone: input.phone,
            phoneVerificationOtpHash: otpHash,
            phoneVerificationOtpExpiresAt: nowPlusMinutes(env_1.env.otpTtlMinutes),
            provider: 'PHONE',
            role: 'PATIENT',
            firstName: '',
            lastName: '',
        },
    });
    return {
        userId: String(user.id),
        phone: user.phone,
        message: 'Phone OTP sent.',
        devOtp: env_1.env.nodeEnv !== 'production' ? otp : undefined,
    };
};
exports.registerWithPhone = registerWithPhone;
const verifyPhoneOtp = async (input) => {
    const user = await db.user.findFirst({ where: { phone: input.phone } });
    if (!user || !user.phoneVerificationOtpHash || !user.phoneVerificationOtpExpiresAt) {
        throw new error_middleware_1.AppError('Invalid verification request', 400);
    }
    if (user.phoneVerificationOtpExpiresAt < new Date()) {
        throw new error_middleware_1.AppError('OTP expired', 400);
    }
    const validOtp = await (0, hash_1.verifyOtp)(input.otp, user.phoneVerificationOtpHash);
    if (!validOtp) {
        throw new error_middleware_1.AppError('Invalid OTP', 400);
    }
    await db.user.update({
        where: { id: user.id },
        data: {
            phoneVerified: true,
            phoneVerificationOtpHash: null,
            phoneVerificationOtpExpiresAt: null,
        },
    });
};
exports.verifyPhoneOtp = verifyPhoneOtp;
const resolveUserByIdentifier = async (identifier) => {
    const isEmail = identifier.includes('@');
    if (isEmail) {
        return db.user.findUnique({ where: { email: identifier.toLowerCase() } });
    }
    return db.user.findFirst({ where: { phone: identifier } });
};
const loginWithPassword = async (input, meta) => {
    const user = await resolveUserByIdentifier(input.identifier);
    if (!user || !user.passwordHash) {
        await audit('LOGIN_FAILED', 'failure', meta, { email: input.identifier });
        throw new error_middleware_1.AppError('Invalid credentials', 401);
    }
    if (user.isDeleted) {
        await audit('LOGIN_FAILED', 'failure', meta, { email: input.identifier, userId: user.id });
        throw new error_middleware_1.AppError('User account is deleted', 410);
    }
    if (user.lockUntil && user.lockUntil > new Date()) {
        throw new error_middleware_1.AppError('Account temporarily locked. Try again later.', 423);
    }
    const validPassword = await (0, hash_1.verifyPassword)(input.password, user.passwordHash);
    if (!validPassword) {
        const nextFailedAttempts = (user.failedLoginAttempts ?? 0) + 1;
        const willLock = nextFailedAttempts >= env_1.env.maxLoginAttempts;
        await db.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: nextFailedAttempts,
                lockUntil: willLock ? nowPlusMinutes(env_1.env.lockoutWindowMinutes) : user.lockUntil,
            },
        });
        if (willLock) {
            await audit('LOCKOUT_TRIGGERED', 'failure', meta, { userId: user.id, email: user.email });
        }
        await audit('LOGIN_FAILED', 'failure', meta, { userId: user.id, email: user.email });
        throw new error_middleware_1.AppError('Invalid credentials', 401);
    }
    if (user.mfaEnabled) {
        if (!input.mfaCode || !user.mfaSecret || !otplib_1.authenticator.check(input.mfaCode, user.mfaSecret)) {
            throw new error_middleware_1.AppError('Invalid MFA code', 401);
        }
    }
    await db.user.update({
        where: { id: user.id },
        data: {
            failedLoginAttempts: 0,
            lockUntil: null,
            lastLoginAt: new Date(),
        },
    });
    const tokenPair = await issueSessionTokens(String(user.id), meta);
    await audit('LOGIN_SUCCESS', 'success', meta, { userId: user.id, email: user.email, phone: user.phone });
    return {
        user: {
            id: String(user.id),
            email: user.email,
            phone: user.phone,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            mfaEnabled: user.mfaEnabled,
        },
        ...tokenPair,
    };
};
exports.loginWithPassword = loginWithPassword;
const loginWithGoogle = async (input, meta) => {
    if (!env_1.env.googleClientId) {
        throw new error_middleware_1.AppError('Google OAuth is not configured', 500);
    }
    const ticket = await googleClient.verifyIdToken({
        idToken: input.idToken,
        audience: env_1.env.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
        throw new error_middleware_1.AppError('Invalid Google token', 401);
    }
    let user = await db.user.findFirst({
        where: {
            OR: [{ googleId: payload.sub }, { email: payload.email?.toLowerCase() ?? undefined }],
        },
    });
    if (user?.isDeleted) {
        throw new error_middleware_1.AppError('User account is deleted', 410);
    }
    if (!user) {
        user = await db.user.create({
            data: {
                email: payload.email?.toLowerCase() ?? null,
                emailVerified: payload.email_verified ?? false,
                googleId: payload.sub,
                provider: 'GOOGLE',
                role: 'PATIENT',
                firstName: payload.given_name ?? '',
                lastName: payload.family_name ?? '',
                name: payload.name ?? null,
            },
        });
    }
    else if (!user.googleId) {
        user = await db.user.update({
            where: { id: user.id },
            data: {
                googleId: payload.sub,
                provider: 'GOOGLE',
                emailVerified: payload.email_verified ?? user.emailVerified,
            },
        });
    }
    const tokenPair = await issueSessionTokens(String(user.id), meta);
    await audit('LOGIN_SUCCESS', 'success', meta, { userId: user.id, email: user.email });
    return {
        user: {
            id: String(user.id),
            email: user.email,
            phone: user.phone,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            mfaEnabled: user.mfaEnabled,
        },
        ...tokenPair,
    };
};
exports.loginWithGoogle = loginWithGoogle;
const refreshAuthTokens = async (input, meta) => {
    const payload = (0, jwt_1.verifyRefreshToken)(input.refreshToken);
    const refreshTokenHash = (0, hash_1.hashOpaqueToken)(input.refreshToken);
    const session = await db.authSession.findFirst({
        where: {
            id: payload.sessionId,
            jti: payload.jti,
            refreshTokenHash,
            revokedAt: null,
            expiresAt: { gt: new Date() },
        },
    });
    if (!session) {
        throw new error_middleware_1.AppError('Invalid refresh token', 401);
    }
    await db.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const tokenPair = await issueSessionTokens(payload.sub, meta);
    await audit('TOKEN_REFRESHED', 'success', meta, { userId: payload.sub });
    return tokenPair;
};
exports.refreshAuthTokens = refreshAuthTokens;
const logoutSession = async (sessionId, userId, meta) => {
    await db.authSession.updateMany({ where: { id: sessionId, userId }, data: { revokedAt: new Date() } });
    await audit('LOGOUT', 'success', meta, { userId });
};
exports.logoutSession = logoutSession;
const requestPasswordReset = async (input, meta) => {
    const user = await resolveUserByIdentifier(input.identifier);
    if (user) {
        const otp = (0, hash_1.generateNumericOtp)();
        await db.user.update({
            where: { id: user.id },
            data: {
                passwordResetOtpHash: await (0, hash_1.hashOtp)(otp),
                passwordResetOtpExpiresAt: nowPlusMinutes(env_1.env.resetOtpTtlMinutes),
            },
        });
        await audit('PASSWORD_RESET_REQUESTED', 'success', meta, { userId: user.id, email: user.email });
        return {
            message: 'Password reset OTP sent.',
            devOtp: env_1.env.nodeEnv !== 'production' ? otp : undefined,
        };
    }
    return { message: 'If the account exists, reset instructions were sent.' };
};
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = async (input, meta) => {
    const user = await resolveUserByIdentifier(input.identifier);
    if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
        throw new error_middleware_1.AppError('Invalid reset request', 400);
    }
    if (user.passwordResetOtpExpiresAt < new Date()) {
        throw new error_middleware_1.AppError('Reset OTP expired', 400);
    }
    const validOtp = await (0, hash_1.verifyOtp)(input.otp, user.passwordResetOtpHash);
    if (!validOtp) {
        throw new error_middleware_1.AppError('Invalid OTP', 400);
    }
    await db.user.update({
        where: { id: user.id },
        data: {
            passwordHash: await (0, hash_1.hashPassword)(input.newPassword),
            passwordResetOtpHash: null,
            passwordResetOtpExpiresAt: null,
            passwordChangedAt: new Date(),
        },
    });
    await db.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit('PASSWORD_RESET_SUCCESS', 'success', meta, { userId: user.id, email: user.email });
};
exports.resetPassword = resetPassword;
const setupMfa = async (input) => {
    const user = await db.user.findUnique({ where: { id: input.userId } });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    const secret = otplib_1.authenticator.generateSecret();
    await db.user.update({ where: { id: user.id }, data: { mfaSecret: secret } });
    const otpauthUrl = otplib_1.authenticator.keyuri(user.email ?? user.phone ?? String(user.id), env_1.env.mfaIssuer, secret);
    return {
        secret,
        otpauthUrl,
    };
};
exports.setupMfa = setupMfa;
const verifyAndEnableMfa = async (input) => {
    const user = await db.user.findUnique({ where: { id: input.userId } });
    if (!user || !user.mfaSecret) {
        throw new error_middleware_1.AppError('MFA setup not initialized', 400);
    }
    if (!otplib_1.authenticator.check(input.code, user.mfaSecret)) {
        throw new error_middleware_1.AppError('Invalid MFA verification code', 400);
    }
    await db.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
};
exports.verifyAndEnableMfa = verifyAndEnableMfa;
const getActiveSessions = async (userId) => {
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
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        device: session.device,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
    }));
};
exports.getActiveSessions = getActiveSessions;
const revokeSession = async (userId, sessionId) => {
    const session = await db.authSession.findFirst({ where: { id: sessionId, userId, revokedAt: null } });
    if (!session) {
        throw new error_middleware_1.AppError('Session not found', 404);
    }
    await db.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
};
exports.revokeSession = revokeSession;
