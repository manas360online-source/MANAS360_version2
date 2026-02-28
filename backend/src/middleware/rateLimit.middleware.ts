import { Request, Response, NextFunction } from 'express';
import { redisUtils } from '../config/redis';
import { env } from '../config/env';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Redis-based rate limiter
 * Uses sliding window algorithm
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = env.RATE_LIMIT_WINDOW_MS,
    maxRequests = env.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator = (req) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `rate_limit:${keyGenerator(req)}`;
      const windowSeconds = Math.floor(windowMs / 1000);

      // Get current count
      const currentCount = await redisUtils.incr(key);

      // Set expiry on first request
      if (currentCount === 1) {
        await redisUtils.expire(key, windowSeconds);
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
      res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);

      // Check if limit exceeded
      if (currentCount > maxRequests) {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          count: currentCount,
          limit: maxRequests,
        });

        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Too many requests. Please try again later.',
            retryAfter: windowSeconds,
          },
        });
      }

      // Handle skipSuccessfulRequests
      if (skipSuccessfulRequests) {
        res.on('finish', async () => {
          if (res.statusCode < 400) {
            await redisUtils.incr(`${key}:decr`);
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error', error);
      // Fail open - don't block request if Redis is down
      next();
    }
  };
}

/**
 * Strict rate limiter for sensitive endpoints
 */
export function strictRateLimit(maxRequests: number = 5, windowMs: number = 60000) {
  return rateLimit({
    maxRequests,
    windowMs,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  });
}

/**
 * Per-user rate limiter
 */
export function userRateLimit(maxRequests: number = 100, windowMs: number = 900000) {
  return rateLimit({
    maxRequests,
    windowMs,
    keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  });
}
