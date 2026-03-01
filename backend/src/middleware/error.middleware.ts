import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';
import { env } from '../config/env';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public code: string = ERROR_CODES.INTERNAL_ERROR,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code = ERROR_CODES.INTERNAL_ERROR;
  let message = 'Internal server error';
  let details: any = undefined;

  // Handle AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }
  // Handle Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // Handle Prisma errors
  else if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      statusCode = HTTP_STATUS.CONFLICT;
      code = ERROR_CODES.VALIDATION_ERROR;
      message = 'Resource already exists';
      details = { fields: prismaError.meta?.target };
    }
    // Foreign key constraint violation
    else if (prismaError.code === 'P2003') {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      code = ERROR_CODES.VALIDATION_ERROR;
      message = 'Invalid reference';
    }
    // Record not found
    else if (prismaError.code === 'P2025') {
      statusCode = HTTP_STATUS.NOT_FOUND;
      code = ERROR_CODES.RESOURCE_NOT_FOUND;
      message = 'Resource not found';
    }
  }

  // Log error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    code,
    statusCode,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(env.isDevelopment && { stack: err.stack }),
    },
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

/**
 * Async handler wrapper
 * Catches async errors and passes to error handler
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
