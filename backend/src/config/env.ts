import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  
  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // Razorpay
  PAYMENT_PROVIDER: z.string().default('razorpay'),
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  RAZORPAY_WEBHOOK_SECRET: z.string(),
  
  // Business Rules
  PLATFORM_COMMISSION_PERCENT: z.string().default('40'),
  THERAPIST_SHARE_PERCENT: z.string().default('60'),
  MIN_PAYOUT_AMOUNT: z.string().default('100000'), // 1000 INR in paise
  
  // Agora
  AGORA_APP_ID: z.string().optional(),
  AGORA_APP_CERTIFICATE: z.string().optional(),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
});

const parsed = envSchema.safeParse(process.env);

export interface EnvConfig {
	nodeEnv: NodeEnv;
	port: number;
	apiPrefix: string;
	corsOrigin: string;
	databaseUrl?: string;
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
	redisUrl: string;
	analyticsRollupIntervalSeconds?: number;
	razorpayKeyId?: string;
	razorpayKeySecret?: string;
	razorpayWebhookSecret?: string;
	paymentProviderSharePercent: number;
	paymentPlatformSharePercent: number;
	webhookIdempotencyTtlSeconds: number;
	minPayoutMinor: number;
}

export const env: EnvConfig = Object.freeze({
	nodeEnv: parseNodeEnv(process.env.NODE_ENV),
	port: parsePort(process.env.PORT),
	apiPrefix: process.env.API_PREFIX ?? '/api',
	corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
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
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PORT: parseInt(parsed.data.PORT),
  PLATFORM_COMMISSION_PERCENT: parseInt(parsed.data.PLATFORM_COMMISSION_PERCENT),
  THERAPIST_SHARE_PERCENT: parseInt(parsed.data.THERAPIST_SHARE_PERCENT),
  MIN_PAYOUT_AMOUNT: parseInt(parsed.data.MIN_PAYOUT_AMOUNT),
  RATE_LIMIT_WINDOW_MS: parseInt(parsed.data.RATE_LIMIT_WINDOW_MS),
  RATE_LIMIT_MAX_REQUESTS: parseInt(parsed.data.RATE_LIMIT_MAX_REQUESTS),
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
};

export type Env = typeof env;
