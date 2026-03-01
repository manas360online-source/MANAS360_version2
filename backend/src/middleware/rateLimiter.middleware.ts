import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many authentication attempts. Try again in 15 minutes.',
	},
});

export const userSessionRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many session management requests. Try again in 15 minutes.',
	},
});

export const paymentRateLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many payment requests. Try again shortly.',
	},
});

export const webhookRateLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 120,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many webhook requests.',
	},
});

