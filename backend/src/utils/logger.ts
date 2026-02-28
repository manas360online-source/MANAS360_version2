import winston from 'winston';
import { env } from '../config/env';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  })
);

export const logger = winston.createLogger({
  level: env.isDevelopment ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'manas360-api' },
  transports: [
    new winston.transports.Console({
      format: env.isDevelopment ? consoleFormat : logFormat,
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Suppress logs in test environment
if (env.isTest) {
  logger.transports.forEach((t) => (t.silent = true));
}
