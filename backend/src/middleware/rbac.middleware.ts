import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppError } from './error.middleware';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Require specific role(s)
 * @param roles - Single role or array of roles
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED));
    }

    if (!roles.includes(req.user.role as UserRole)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        requiredRoles: roles,
        actualRole: req.user.role,
      });
      return next(
        new AppError(
          'Insufficient permissions',
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN
        )
      );
    }

    next();
  };
}

/**
 * Require specific permission
 * Checks against role_permissions table
 * @param resource - Resource name (e.g., 'sessions', 'payments')
 * @param action - Action name (e.g., 'create', 'read', 'update', 'delete')
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('Not authenticated', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED));
      }

      // Check if permission exists for this role
      const permission = await prisma.rolePermission.findFirst({
        where: {
          role: req.user.role as UserRole,
          permission: {
            resource,
            action,
          },
        },
      });

      if (!permission) {
        logger.warn('Unauthorized permission access attempt', {
          userId: req.user.id,
          role: req.user.role,
          resource,
          action,
        });
        return next(
          new AppError(
            `No permission to ${action} ${resource}`,
            HTTP_STATUS.FORBIDDEN,
            ERROR_CODES.FORBIDDEN
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require user to be the resource owner OR admin
 * @param getUserId - Function to extract user ID from request params/body
 */
export function requireOwnerOrAdmin(getUserId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED));
    }

    const targetUserId = getUserId(req);
    const isOwner = req.user.id === targetUserId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      logger.warn('Unauthorized resource access attempt', {
        userId: req.user.id,
        targetUserId,
      });
      return next(
        new AppError(
          'You can only access your own resources',
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN
        )
      );
    }

    next();
  };
}
