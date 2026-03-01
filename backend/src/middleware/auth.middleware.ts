import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';

const prisma = new PrismaClient();

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authenticate user via JWT token
 * Supports both Bearer token (mobile) and cookies (web)
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // Extract token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback to cookie (for web)
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AppError('No token provided', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
    }

    // Verify JWT
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token expired', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED);
      }
      throw new AppError('Invalid token', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
    }

    if (!user.isActive) {
      throw new AppError('Account deactivated', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't reject if missing
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    await authenticate(req, res, () => {});
  } catch (error) {
    // Ignore auth errors, continue as unauthenticated
  }
  next();
}
