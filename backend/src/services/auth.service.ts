import { randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import {
	hashOpaqueToken,
	hashOtp,
	hashPassword,
	generateNumericOtp,
	verifyOtp,
	verifyPassword,
} from '../utils/hash';
import { createTokenPair, verifyRefreshToken } from '../utils/jwt';
import type {
	GoogleLoginInput,
	LoginInput,
	MfaSetupInput,
	MfaVerifyInput,
	PasswordResetInput,
	PasswordResetRequestInput,
	RefreshInput,
	RegisterEmailInput,
	RegisterPhoneInput,
	RequestMeta,
	VerifyEmailOtpInput,
	VerifyPhoneOtpInput,
} from '../types/auth.types';

const googleClient = new OAuth2Client(env.googleClientId);
const db = prisma as any;

const nowPlusMinutes = (minutes: number): Date => new Date(Date.now() + minutes * 60 * 1000);

const nowPlusDays = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const toPrismaUserRole = (role: RegisterEmailInput['role']): 'PATIENT' | 'THERAPIST' | 'PSYCHIATRIST' | 'COACH' => {
	if (role === 'patient') return 'PATIENT';
	if (role === 'therapist') return 'THERAPIST';
	if (role === 'psychiatrist') return 'PSYCHIATRIST';
	return 'COACH';
};

let supportedUserRolesCache: Set<string> | null = null;

const getSupportedUserRoles = async (): Promise<Set<string>> => {
	if (supportedUserRolesCache) {
		return supportedUserRolesCache;
	}

	try {
		const rows = (await db.$queryRawUnsafe(
			`SELECT e.enumlabel
			 FROM pg_type t
			 JOIN pg_enum e ON t.oid = e.enumtypid
			 WHERE t.typname = 'UserRole'`,
		)) as Array<{ enumlabel: string }>;

		supportedUserRolesCache = new Set((rows ?? []).map((row) => String(row.enumlabel).toUpperCase()));
	} catch {
		supportedUserRolesCache = new Set(['PATIENT', 'THERAPIST', 'ADMIN']);
	}

	return supportedUserRolesCache;
};

const audit = async (
	event: string,
	status: 'success' | 'failure',
	meta: RequestMeta,
	context: Record<string, unknown> = {},
): Promise<void> => {
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

const issueSessionTokens = async (userId: string, meta: RequestMeta) => {
	const createdSession = await db.authSession.create({
		data: {
			userId,
			jti: randomBytes(24).toString('hex'),
			refreshTokenHash: randomBytes(24).toString('hex'),
			expiresAt: nowPlusDays(7),
			ipAddress: meta.ipAddress,
			userAgent: meta.userAgent,
			device: meta.device,
		},
		select: { id: true },
	});

	const tokenPair = createTokenPair(userId, createdSession.id);
	const refreshTokenHash = hashOpaqueToken(tokenPair.refreshToken);

	await db.authSession.update({
		where: { id: createdSession.id },
		data: {
			jti: tokenPair.refreshJti,
			refreshTokenHash,
		},
	});

	return tokenPair;
};

export const registerWithEmail = async (input: RegisterEmailInput, meta: RequestMeta) => {
	const existing = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
	if (existing) {
		if (existing.isDeleted) {
			throw new AppError('Account is deleted. Contact support to restore access.', 410);
		}

		throw new AppError('Email already registered', 409);
	}

	const passwordHash = await hashPassword(input.password);
	const otp = generateNumericOtp();
	const otpHash = await hashOtp(otp);
	const prismaRole = toPrismaUserRole(input.role);
	const supportedRoles = await getSupportedUserRoles();

	if (!supportedRoles.has(prismaRole)) {
		throw new AppError(`Selected role '${input.role}' is not enabled yet. Role migration is pending.`, 400);
	}

	const user = await db.user.create({
		data: {
			email: input.email.toLowerCase(),
			passwordHash,
			emailVerificationOtpHash: otpHash,
			emailVerificationOtpExpiresAt: nowPlusMinutes(env.otpTtlMinutes),
			provider: 'LOCAL',
			role: prismaRole,
			name: input.name,
			firstName: input.name.trim(),
			lastName: '',
		},
	});

	await audit('REGISTER_SUCCESS', 'success', meta, { userId: user.id, email: user.email });

	return {
		userId: String(user.id),
		email: user.email,
		message: 'Registration successful. Verify your email OTP.',
		devOtp: env.nodeEnv !== 'production' ? otp : undefined,
	};
};

export const verifyEmailOtp = async (input: VerifyEmailOtpInput): Promise<void> => {
	const user = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
	if (!user || !user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt) {
		throw new AppError('Invalid verification request', 400);
	}

	if (user.emailVerificationOtpExpiresAt < new Date()) {
		throw new AppError('OTP expired', 400);
	}

	const validOtp = await verifyOtp(input.otp, user.emailVerificationOtpHash);
	if (!validOtp) {
		throw new AppError('Invalid OTP', 400);
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

export const registerWithPhone = async (input: RegisterPhoneInput) => {
	const existing = await db.user.findFirst({ where: { phone: input.phone } });
	if (existing) {
		if (existing.isDeleted) {
			throw new AppError('Account is deleted. Contact support to restore access.', 410);
		}

		throw new AppError('Phone already registered', 409);
	}

	const otp = generateNumericOtp();
	const otpHash = await hashOtp(otp);

	const user = await db.user.create({
		data: {
			phone: input.phone,
			phoneVerificationOtpHash: otpHash,
			phoneVerificationOtpExpiresAt: nowPlusMinutes(env.otpTtlMinutes),
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
		devOtp: env.nodeEnv !== 'production' ? otp : undefined,
	};
};

export const verifyPhoneOtp = async (input: VerifyPhoneOtpInput): Promise<void> => {
	const user = await db.user.findFirst({ where: { phone: input.phone } });
	if (!user || !user.phoneVerificationOtpHash || !user.phoneVerificationOtpExpiresAt) {
		throw new AppError('Invalid verification request', 400);
	}

	if (user.phoneVerificationOtpExpiresAt < new Date()) {
		throw new AppError('OTP expired', 400);
	}

	const validOtp = await verifyOtp(input.otp, user.phoneVerificationOtpHash);
	if (!validOtp) {
		throw new AppError('Invalid OTP', 400);
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

const resolveUserByIdentifier = async (identifier: string) => {
	const isEmail = identifier.includes('@');
	if (isEmail) {
		return db.user.findUnique({ where: { email: identifier.toLowerCase() } });
	}
	return db.user.findFirst({ where: { phone: identifier } });
};

export const loginWithPassword = async (input: LoginInput, meta: RequestMeta) => {
	const user = await resolveUserByIdentifier(input.identifier);
	if (!user || !user.passwordHash) {
		await audit('LOGIN_FAILED', 'failure', meta, { email: input.identifier });
		throw new AppError('Invalid credentials', 401);
	}

	if (user.isDeleted) {
		await audit('LOGIN_FAILED', 'failure', meta, { email: input.identifier, userId: user.id });
		throw new AppError('User account is deleted', 410);
	}

	if (user.lockUntil && user.lockUntil > new Date()) {
		throw new AppError('Account temporarily locked. Try again later.', 423);
	}

	const validPassword = await verifyPassword(input.password, user.passwordHash);
	if (!validPassword) {
		const nextFailedAttempts = (user.failedLoginAttempts ?? 0) + 1;
		const willLock = nextFailedAttempts >= env.maxLoginAttempts;
		await db.user.update({
			where: { id: user.id },
			data: {
				failedLoginAttempts: nextFailedAttempts,
				lockUntil: willLock ? nowPlusMinutes(env.lockoutWindowMinutes) : user.lockUntil,
			},
		});

		if (willLock) {
			await audit('LOCKOUT_TRIGGERED', 'failure', meta, { userId: user.id, email: user.email });
		}
		await audit('LOGIN_FAILED', 'failure', meta, { userId: user.id, email: user.email });
		throw new AppError('Invalid credentials', 401);
	}

	if (user.email && !user.emailVerified) {
		await audit('LOGIN_BLOCKED_EMAIL_UNVERIFIED', 'failure', meta, { userId: user.id, email: user.email });
		throw new AppError('Email verification required before login', 403);
	}

	if (user.mfaEnabled) {
		if (!input.mfaCode || !user.mfaSecret || !authenticator.check(input.mfaCode, user.mfaSecret)) {
			throw new AppError('Invalid MFA code', 401);
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
			role: user.role,
			emailVerified: user.emailVerified,
			phoneVerified: user.phoneVerified,
			mfaEnabled: user.mfaEnabled,
		},
		...tokenPair,
	};
};

export const loginWithGoogle = async (input: GoogleLoginInput, meta: RequestMeta) => {
	if (!env.googleClientId) {
		throw new AppError('Google OAuth is not configured', 500);
	}

	const ticket = await googleClient.verifyIdToken({
		idToken: input.idToken,
		audience: env.googleClientId,
	});

	const payload = ticket.getPayload();
	if (!payload?.sub) {
		throw new AppError('Invalid Google token', 401);
	}

	let user = await db.user.findFirst({
		where: {
			OR: [{ googleId: payload.sub }, { email: payload.email?.toLowerCase() ?? undefined }],
		},
	});

	if (user?.isDeleted) {
		throw new AppError('User account is deleted', 410);
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
	} else if (!user.googleId) {
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
			role: user.role,
			emailVerified: user.emailVerified,
			phoneVerified: user.phoneVerified,
			mfaEnabled: user.mfaEnabled,
		},
		...tokenPair,
	};
};

export const refreshAuthTokens = async (input: RefreshInput, meta: RequestMeta) => {
	const payload = verifyRefreshToken(input.refreshToken);
	const refreshTokenHash = hashOpaqueToken(input.refreshToken);

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
		throw new AppError('Invalid refresh token', 401);
	}

	await db.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

	const tokenPair = await issueSessionTokens(payload.sub, meta);
	await audit('TOKEN_REFRESHED', 'success', meta, { userId: payload.sub });

	return tokenPair;
};

export const logoutSession = async (sessionId: string, userId: string, meta: RequestMeta): Promise<void> => {
	await db.authSession.updateMany({ where: { id: sessionId, userId }, data: { revokedAt: new Date() } });

	await audit('LOGOUT', 'success', meta, { userId });
};

export const requestPasswordReset = async (input: PasswordResetRequestInput, meta: RequestMeta) => {
	const user = await resolveUserByIdentifier(input.identifier);

	if (user) {
		const otp = generateNumericOtp();
		await db.user.update({
			where: { id: user.id },
			data: {
				passwordResetOtpHash: await hashOtp(otp),
				passwordResetOtpExpiresAt: nowPlusMinutes(env.resetOtpTtlMinutes),
			},
		});

		await audit('PASSWORD_RESET_REQUESTED', 'success', meta, { userId: user.id, email: user.email });

		return {
			message: 'Password reset OTP sent.',
			devOtp: env.nodeEnv !== 'production' ? otp : undefined,
		};
	}

	return { message: 'If the account exists, reset instructions were sent.' };
};

export const resetPassword = async (input: PasswordResetInput, meta: RequestMeta): Promise<void> => {
	const user = await resolveUserByIdentifier(input.identifier);
	if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
		throw new AppError('Invalid reset request', 400);
	}

	if (user.passwordResetOtpExpiresAt < new Date()) {
		throw new AppError('Reset OTP expired', 400);
	}

	const validOtp = await verifyOtp(input.otp, user.passwordResetOtpHash);
	if (!validOtp) {
		throw new AppError('Invalid OTP', 400);
	}

	await db.user.update({
		where: { id: user.id },
		data: {
			passwordHash: await hashPassword(input.newPassword),
			passwordResetOtpHash: null,
			passwordResetOtpExpiresAt: null,
			passwordChangedAt: new Date(),
		},
	});

	await db.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
	await audit('PASSWORD_RESET_SUCCESS', 'success', meta, { userId: user.id, email: user.email });
};

export const setupMfa = async (input: MfaSetupInput) => {
	const user = await db.user.findUnique({ where: { id: input.userId } });
	if (!user) {
		throw new AppError('User not found', 404);
	}

	const secret = authenticator.generateSecret();
	await db.user.update({ where: { id: user.id }, data: { mfaSecret: secret } });

	const otpauthUrl = authenticator.keyuri(user.email ?? user.phone ?? String(user.id), env.mfaIssuer, secret);

	return {
		secret,
		otpauthUrl,
	};
};

export const verifyAndEnableMfa = async (input: MfaVerifyInput): Promise<void> => {
	const user = await db.user.findUnique({ where: { id: input.userId } });
	if (!user || !user.mfaSecret) {
		throw new AppError('MFA setup not initialized', 400);
	}

	if (!authenticator.check(input.code, user.mfaSecret)) {
		throw new AppError('Invalid MFA verification code', 400);
	}

	await db.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
};

export const getActiveSessions = async (userId: string) => {
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

export const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
	const session = await db.authSession.findFirst({ where: { id: sessionId, userId, revokedAt: null } });
	if (!session) {
		throw new AppError('Session not found', 404);
	}

	await db.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
};
