import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppError } from './error.middleware';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';
import { logger } from '../utils/logger';

const db = prisma as any;

/**
 * Role type definition
 * Extensible enum for user roles
 * Can be extended for superadmin, moderator, etc.
 */
export type UserRole = 'patient' | 'therapist' | 'admin' | 'superadmin';

/**
 * Role hierarchy for logical grouping
 * Useful for future permission inheritance
 */
export const roleHierarchy: Record<UserRole, number> = {
	patient: 1,
	therapist: 2,
	admin: 3,
	superadmin: 4,
};

/**
 * Cache for user role to reduce database queries
 * TTL: 5 minutes
 * Key: userId, Value: { role, timestamp }
 */
const roleCache = new Map<string, { role: UserRole; timestamp: number; isDeleted: boolean }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clear role cache (useful after role updates)
 */
export const clearRoleCache = (userId?: string): void => {
	if (userId) {
		roleCache.delete(userId);
	} else {
		roleCache.clear();
	}
};

/**
 * Get user role with caching
 *
 * Security considerations:
 * 1. Cache includes isDeleted flag to invalidate on account deletion
 * 2. TTL prevents stale data (max 5 minutes)
 * 3. Always verifies user exists in database
 * 4. Returns null if user not found or deleted
 *
 * @param userId - User ID from JWT
 * @returns Object with role and deleted status, or null if user not found
 */
const getUserRole = async (userId: string): Promise<{ role: UserRole; isDeleted: boolean } | null> => {
	// Check cache first
	const cached = roleCache.get(userId);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
		if (cached.isDeleted) {
			return null; // User was deleted, don't return cached role
		}
		return { role: cached.role, isDeleted: cached.isDeleted };
	}

	// Query database if not in cache
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	if (!user) {
		return null;
	}

	// Cache the result
	roleCache.set(userId, {
		role: String(user.role).toLowerCase() as UserRole,
		timestamp: Date.now(),
		isDeleted: false,
	});

	return {
		role: String(user.role).toLowerCase() as UserRole,
		isDeleted: false,
	};
};

/**
 * Generic role-based access control middleware
 *
 * Security features:
 * 1. Extracts userId from JWT (via requireAuth middleware)
 * 2. Validates user exists and is not deleted
 * 3. Checks role against allowed roles
 * 4. Prevents privilege escalation by verifying in database
 * 5. Caches roles to reduce database load
 * 6. Supports single role or multiple roles
 *
 * @param allowedRoles - Single role string or array of allowed roles
 * @returns Express middleware function
 *
 * @example
 * // Single role
 * router.get('/admin', requireRole('admin'), handler);
 *
 * @example
 * // Multiple roles
 * router.get('/sensitive', requireRole(['admin', 'superadmin']), handler);
 */
export const requireRole = (
	allowedRoles: UserRole | UserRole[],
): ((req: Request, _res: Response, next: NextFunction) => Promise<void>) => {
	const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

	// Validate allowed roles at middleware creation time (defense in depth)
	const validRoles = Object.keys(roleHierarchy) as UserRole[];
	for (const role of roles) {
		if (!validRoles.includes(role)) {
			throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
		}
	}

	return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
		try {
			// Extract user ID from JWT (populated by requireAuth middleware)
			const userId = req.auth?.userId;

			if (!userId) {
				next(new AppError('Authentication required', 401));
				return;
			}

			// Get user role with caching
			const userDetails = await getUserRole(userId);

			// User not found in database
			if (!userDetails) {
				next(new AppError('User not found', 404));
				return;
			}

			// User account is deleted
			if (userDetails.isDeleted) {
				next(new AppError('User account is deleted. Please contact support.', 410));
				return;
			}

			// Check if user's role is in allowed roles
			if (!roles.includes(userDetails.role)) {
				// Log unauthorized attempt for security audit
				console.warn(
					`[RBAC] Unauthorized access attempt - userId: ${userId}, userRole: ${userDetails.role}, requiredRoles: ${roles.join(',')}`,
				);

				next(
					new AppError(
						`Access denied. Required role(s): ${roles.join(' or ')}. Your role: ${userDetails.role}`,
						403,
					),
				);
				return;
			}

			// Store role in request for downstream handlers
			if (!req.auth) {
				req.auth = {
					userId: '',
					sessionId: '',
					jti: '',
				};
			}
			req.auth.role = userDetails.role;

			next();
		} catch (error) {
			// Fail securely on unexpected errors
			console.error('[RBAC] Error during role verification:', error);
			next(new AppError('Authorization failed', 500));
		}
	};
};

/**
 * Backward compatibility: Require patient role
 * @deprecated Use requireRole('patient') instead
 */
export const requirePatientRole = requireRole('patient') as (
	req: Request,
	_res: Response,
	next: NextFunction,
) => Promise<void>;
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
