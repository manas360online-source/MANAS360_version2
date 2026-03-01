import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { redis } from './config/redis';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('✅ Redis connected');

    // Start server
    const server = app.listen(env.PORT, () => {
      logger.info(`✅ Server running on port ${env.PORT}`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔒 CORS Origin: ${env.CORS_ORIGIN}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('🛑 Shutting down server...');
      
      server.close(() => {
        logger.info('✅ Server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('❌ Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('❌ Bootstrap failed', error);
    process.exit(1);
  }
}

bootstrap();
