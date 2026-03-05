"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const parseNodeEnv = (value) => {
    if (value === 'development' || value === 'test' || value === 'production' || value === 'staging') {
        return value;
    }
    return 'development';
};
const parsePort = (value) => {
    const parsedPort = Number(value);
    if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
        return parsedPort;
    }
    return 3000;
};
const parseBoolean = (value, fallback = false) => {
    if (value === undefined) {
        return fallback;
    }
    return value === 'true';
};
const parseNumber = (value, fallback) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }
    return fallback;
};
const parseCorsOrigins = (value) => {
    const raw = value ?? 'http://localhost:5173';
    return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
};
exports.env = Object.freeze({
    nodeEnv: parseNodeEnv(process.env.NODE_ENV),
    port: parsePort(process.env.PORT),
    apiPrefix: process.env.API_PREFIX ?? '/api',
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
    databaseUrl: process.env.DATABASE_URL,
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
    redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    analyticsRollupIntervalSeconds: parseNumber(process.env.ANALYTICS_ROLLUP_INTERVAL_SECONDS, 3600),
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    paymentProviderSharePercent: parseNumber(process.env.PAYMENT_PROVIDER_SHARE_PERCENT, 60),
    paymentPlatformSharePercent: parseNumber(process.env.PAYMENT_PLATFORM_SHARE_PERCENT, 40),
    webhookIdempotencyTtlSeconds: parseNumber(process.env.WEBHOOK_IDEMPOTENCY_TTL_SECONDS, 3600),
    minPayoutMinor: parseNumber(process.env.MIN_PAYOUT_MINOR, 10000),
});
