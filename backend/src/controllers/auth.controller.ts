import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { prisma } from '../config/db';
import {
	getActiveSessions,
	loginWithGoogle,
	loginWithPassword,
	logoutSession,
	refreshAuthTokens,
	registerWithEmail,
	registerWithPhone,
	requestPasswordReset,
	resetPassword,
	revokeSession,
	setupMfa,
	verifyAndEnableMfa,
	verifyEmailOtp,
	verifyPhoneOtp,
} from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import {
	validateEmail,
	validateOtp,
	validatePassword,
	validatePhone,
} from '../validators/auth.validator';
import { AppError } from '../middleware/error.middleware';

const getRequestMeta = (req: Request) => ({
	ipAddress: req.ip,
	userAgent: req.get('user-agent'),
	device: req.get('x-device-id') ?? undefined,
});

const tokenCookieOptions = {
	httpOnly: true,
	secure: env.cookieSecure,
	sameSite: 'strict' as const,
	domain: env.cookieDomain,
	path: '/',
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
	res.cookie('access_token', accessToken, {
		...tokenCookieOptions,
		maxAge: 15 * 60 * 1000,
	});

	res.cookie(env.refreshCookieName, refreshToken, {
		...tokenCookieOptions,
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});

	res.cookie(env.csrfCookieName, randomBytes(24).toString('hex'), {
		httpOnly: false,
		secure: env.cookieSecure,
		sameSite: 'strict',
		domain: env.cookieDomain,
		path: '/',
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});
};

export const registerController = async (req: Request, res: Response): Promise<void> => {
	const result = await registerWithEmail(
		{
			email: validateEmail(req.body.email),
			password: validatePassword(req.body.password),
			name: typeof req.body.name === 'string' ? req.body.name.trim() || undefined : undefined,
		},
		getRequestMeta(req),
	);

	sendSuccess(res, result, 'Registration successful', 201);
};

export const meController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	const user = await prisma.user.findUnique({
		where: { id: req.auth.userId },
		select: {
			id: true,
			email: true,
			phone: true,
			role: true,
			firstName: true,
			lastName: true,
			emailVerified: true,
			phoneVerified: true,
			mfaEnabled: true,
		},
	});

	if (!user) {
		throw new AppError('User not found', 404);
	}

	sendSuccess(
		res,
		{
			id: String(user.id),
			email: user.email,
			phone: user.phone,
			role: user.role,
			firstName: user.firstName,
			lastName: user.lastName,
			emailVerified: user.emailVerified,
			phoneVerified: user.phoneVerified,
			mfaEnabled: user.mfaEnabled,
		},
		'Authenticated user fetched',
	);
};

export const signupWithEmailController = async (req: Request, res: Response): Promise<void> => {
	const result = await registerWithEmail(
		{
			email: validateEmail(req.body.email),
			password: validatePassword(req.body.password),
		},
		getRequestMeta(req),
	);

	sendSuccess(res, result, 'Registration successful', 201);
};

export const verifyEmailOtpController = async (req: Request, res: Response): Promise<void> => {
	await verifyEmailOtp({
		email: validateEmail(req.body.email),
		otp: validateOtp(req.body.otp),
	});

	sendSuccess(res, null, 'Email verified');
};

export const signupWithPhoneController = async (req: Request, res: Response): Promise<void> => {
	const result = await registerWithPhone({
		phone: validatePhone(req.body.phone),
	});

	sendSuccess(res, result, 'Phone OTP sent', 201);
};

export const verifyPhoneOtpController = async (req: Request, res: Response): Promise<void> => {
	await verifyPhoneOtp({
		phone: validatePhone(req.body.phone),
		otp: validateOtp(req.body.otp),
	});

	sendSuccess(res, null, 'Phone verified');
};

export const loginController = async (req: Request, res: Response): Promise<void> => {
	const result = await loginWithPassword(
		{
			identifier: String(req.body.identifier ?? '').trim(),
			password: validatePassword(req.body.password),
			mfaCode: req.body.mfaCode ? validateOtp(req.body.mfaCode) : undefined,
		},
		getRequestMeta(req),
	);

	setAuthCookies(res, result.accessToken, result.refreshToken);
	sendSuccess(res, { user: result.user, sessionId: result.sessionId }, 'Login successful');
};

export const googleLoginController = async (req: Request, res: Response): Promise<void> => {
	if (typeof req.body.idToken !== 'string' || !req.body.idToken.trim()) {
		throw new AppError('idToken is required', 400);
	}

	const result = await loginWithGoogle({ idToken: req.body.idToken.trim() }, getRequestMeta(req));

	setAuthCookies(res, result.accessToken, result.refreshToken);
	sendSuccess(res, { user: result.user, sessionId: result.sessionId }, 'Google login successful');
};

export const refreshTokenController = async (req: Request, res: Response): Promise<void> => {
	const refreshToken = req.cookies?.[env.refreshCookieName] as string | undefined;
	if (!refreshToken) {
		throw new AppError('Refresh token is required', 401);
	}

	const result = await refreshAuthTokens({ refreshToken }, getRequestMeta(req));
	setAuthCookies(res, result.accessToken, result.refreshToken);

	sendSuccess(res, { sessionId: result.sessionId }, 'Token refreshed');
};

export const requestPasswordResetController = async (req: Request, res: Response): Promise<void> => {
	const identifier = String(req.body.identifier ?? '').trim();
	if (!identifier) {
		throw new AppError('identifier is required', 400);
	}

	const result = await requestPasswordReset({ identifier }, getRequestMeta(req));
	sendSuccess(res, result, 'Password reset initiated');
};

export const resetPasswordController = async (req: Request, res: Response): Promise<void> => {
	const identifier = String(req.body.identifier ?? '').trim();
	if (!identifier) {
		throw new AppError('identifier is required', 400);
	}

	await resetPassword(
		{
			identifier,
			otp: validateOtp(req.body.otp),
			newPassword: validatePassword(req.body.newPassword),
		},
		getRequestMeta(req),
	);

	sendSuccess(res, null, 'Password reset successful');
};

export const mfaSetupController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	const result = await setupMfa({ userId: req.auth.userId });
	sendSuccess(res, result, 'MFA setup initialized');
};

export const mfaVerifyController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	await verifyAndEnableMfa({
		userId: req.auth.userId,
		code: validateOtp(req.body.code),
	});

	sendSuccess(res, null, 'MFA enabled');
};

export const logoutController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId || !req.auth.sessionId) {
		throw new AppError('Authentication required', 401);
	}

	await logoutSession(req.auth.sessionId, req.auth.userId, getRequestMeta(req));

	res.clearCookie('access_token', tokenCookieOptions);
	res.clearCookie(env.refreshCookieName, tokenCookieOptions);
	res.clearCookie(env.csrfCookieName, {
		httpOnly: false,
		secure: env.cookieSecure,
		sameSite: 'strict',
		domain: env.cookieDomain,
		path: '/',
	});

	sendSuccess(res, null, 'Logged out');
};

export const sessionsController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	const sessions = await getActiveSessions(req.auth.userId);
	sendSuccess(res, sessions, 'Active sessions fetched');
};

export const revokeSessionController = async (req: Request, res: Response): Promise<void> => {
	if (!req.auth?.userId) {
		throw new AppError('Authentication required', 401);
	}

	await revokeSession(req.auth.userId, String(req.params.sessionId));
	sendSuccess(res, null, 'Session revoked');
};
