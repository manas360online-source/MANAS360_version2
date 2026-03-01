export interface RequestMeta {
	ipAddress?: string;
	userAgent?: string;
	device?: string;
}

export interface RegisterEmailInput {
	email: string;
	password: string;
	name: string;
	role: 'patient' | 'therapist' | 'psychiatrist' | 'coach';
}

export interface VerifyEmailOtpInput {
	email: string;
	otp: string;
}

export interface RegisterPhoneInput {
	phone: string;
}

export interface VerifyPhoneOtpInput {
	phone: string;
	otp: string;
}

export interface LoginInput {
	identifier: string;
	password: string;
	mfaCode?: string;
}

export interface GoogleLoginInput {
	idToken: string;
}

export interface RefreshInput {
	refreshToken: string;
}

export interface PasswordResetRequestInput {
	identifier: string;
}

export interface PasswordResetInput {
	identifier: string;
	otp: string;
	newPassword: string;
}

export interface MfaSetupInput {
	userId: string;
}

export interface MfaVerifyInput {
	userId: string;
	code: string;
}

export interface JwtAccessPayload {
	sub: string;
	type: 'access';
	sessionId: string;
	jti: string;
}

export interface JwtRefreshPayload {
	sub: string;
	type: 'refresh';
	sessionId: string;
	jti: string;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
	refreshJti: string;
	sessionId: string;
}

