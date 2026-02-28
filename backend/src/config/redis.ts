import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('error', (err) => {
  logger.error('❌ Redis error:', err);
});

export { redis };

// Redis utility functions
export const redisUtils = {
  /**
   * Set with expiry
   */
  async setex(key: string, value: string, expirySeconds: number): Promise<void> {
    await redis.setex(key, expirySeconds, value);
  },

  /**
   * Get value
   */
  async get(key: string): Promise<string | null> {
    return redis.get(key);
  },

  /**
   * Delete key
   */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },

  /**
   * Increment counter (for rate limiting)
   */
  async incr(key: string): Promise<number> {
    return redis.incr(key);
  },

  /**
   * Set expiry on existing key
   */
  async expire(key: string, seconds: number): Promise<void> {
    await redis.expire(key, seconds);
  },
};
