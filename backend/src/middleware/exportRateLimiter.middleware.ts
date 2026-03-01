import type { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { env } from '../config/env';
import { AppError } from './error.middleware';

const REDIS_URL = process.env.REDIS_URL || env.redisUrl || 'redis://127.0.0.1:6379';
const client = createClient({ url: REDIS_URL });
client.on('error', (error) => {
  console.warn('[exportRateLimiter] Redis unavailable, failing open', error);
});
client.connect().catch(() => {});

/**
 * Simple Redis-backed rate limiter for export endpoints.
 * - per-therapist: max 5 exports per 10 minutes
 * - per-session: max 2 exports per 10 minutes
 */
export const exportRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const therapistId = req.auth?.userId;
    const sessionId = String(req.params.id || '');
    if (!therapistId || !sessionId) return next();

    const now = Date.now();
    const windowSec = 10 * 60; // 10 minutes
    const therapistKey = `rl:export:therapist:${therapistId}`;
    const sessionKey = `rl:export:session:${sessionId}`;

    // Atomically increment and set expiry if first seen
    const tCount = await client.incr(therapistKey);
    if (tCount === 1) await client.expire(therapistKey, windowSec);

    if (tCount > 5) {
      return next(new AppError('Export rate limit exceeded for therapist. Try again later.', 429));
    }

    const sCount = await client.incr(sessionKey);
    if (sCount === 1) await client.expire(sessionKey, windowSec);
    if (sCount > 2) {
      return next(new AppError('Export rate limit exceeded for this session. Try again later.', 429));
    }

    // attach remaining quotas for telemetry
    (req as any).rateLimit = { therapistRemaining: Math.max(0, 5 - tCount), sessionRemaining: Math.max(0, 2 - sCount) };
    return next();
  } catch (e) {
    // Fail open: if Redis fails, allow request but log
    console.warn('[exportRateLimiter] Redis error, allowing request', e);
    return next();
  }
};
