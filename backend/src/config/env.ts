type NodeEnv = 'development' | 'test' | 'production';

const parseNodeEnv = (value: string | undefined): NodeEnv => {
	if (value === 'development' || value === 'test' || value === 'production') {
		return value;
	}

	return 'development';
};

const parsePort = (value: string | undefined): number => {
	const parsedPort = Number(value);

	if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
		return parsedPort;
	}

	return 5000;
};

const parseBoolean = (value: string | undefined, fallback = false): boolean => {
	if (value === undefined) {
		return fallback;
	}

	return value === 'true';
};

const parseNumber = (value: string | undefined, fallback: number): number => {
	const parsed = Number(value);

	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}

	return fallback;
};

export interface EnvConfig {
	nodeEnv: NodeEnv;
	port: number;
	apiPrefix: string;
	mongoUri: string;
	jwtAccessSecret: string;
	jwtRefreshSecret: string;
	jwtAccessExpiresIn: string;
	jwtRefreshExpiresIn: string;
	cookieDomain?: string;
	cookieSecure: boolean;
	refreshCookieName: string;
	csrfCookieName: string;
	otpTtlMinutes: number;
	resetOtpTtlMinutes: number;
	maxLoginAttempts: number;
	lockoutWindowMinutes: number;
	googleClientId?: string;
	mfaIssuer: string;
	awsRegion: string;
	awsS3Bucket: string;
	awsAccessKeyId?: string;
	awsSecretAccessKey?: string;
	profilePhotoSignedUrlTtlSeconds: number;
	therapistDocumentSignedUrlTtlSeconds: number;
	exportSignedUrlTtlSeconds: number;
	sessionNotesEncryptionKey: string;
}

export const env: EnvConfig = Object.freeze({
	nodeEnv: parseNodeEnv(process.env.NODE_ENV),
	port: parsePort(process.env.PORT),
	apiPrefix: process.env.API_PREFIX ?? '/api',
	mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/manas360',
	jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-access-secret',
	jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-refresh-secret',
	jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
	jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
	cookieDomain: process.env.COOKIE_DOMAIN,
	cookieSecure: parseBoolean(process.env.COOKIE_SECURE),
	refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'refresh_token',
	csrfCookieName: process.env.CSRF_COOKIE_NAME ?? 'csrf_token',
	otpTtlMinutes: parseNumber(process.env.OTP_TTL_MINUTES, 10),
	resetOtpTtlMinutes: parseNumber(process.env.RESET_OTP_TTL_MINUTES, 15),
	maxLoginAttempts: parseNumber(process.env.MAX_LOGIN_ATTEMPTS, 5),
	lockoutWindowMinutes: parseNumber(process.env.LOCKOUT_WINDOW_MINUTES, 15),
	googleClientId: process.env.GOOGLE_CLIENT_ID,
	mfaIssuer: process.env.MFA_ISSUER ?? 'manas360',
	awsRegion: process.env.AWS_REGION ?? 'ap-south-1',
	awsS3Bucket: process.env.AWS_S3_BUCKET ?? '',
	awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
	awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	profilePhotoSignedUrlTtlSeconds: parseNumber(process.env.PROFILE_PHOTO_SIGNED_URL_TTL_SECONDS, 900),
	therapistDocumentSignedUrlTtlSeconds: parseNumber(process.env.THERAPIST_DOCUMENT_SIGNED_URL_TTL_SECONDS, 900),
	exportSignedUrlTtlSeconds: parseNumber(process.env.EXPORT_SIGNED_URL_TTL_SECONDS, 3600),
	sessionNotesEncryptionKey: process.env.SESSION_NOTES_ENCRYPTION_KEY ?? '',
});

