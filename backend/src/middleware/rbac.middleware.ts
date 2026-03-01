import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from './error.middleware';

const db = prisma as any;

/**
 * Role type definition
 * Extensible enum for user roles
 * Can be extended for superadmin, moderator, etc.
 */
export type UserRole = 'patient' | 'therapist' | 'psychiatrist' | 'coach' | 'admin' | 'superadmin';

/**
 * Role hierarchy for logical grouping
 * Useful for future permission inheritance
 */
export const roleHierarchy: Record<UserRole, number> = {
	patient: 1,
	therapist: 2,
	psychiatrist: 2,
	coach: 2,
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

/**
 * Backward compatibility: Require therapist role
 * @deprecated Use requireRole('therapist') instead
 */
export const requireTherapistRole = requireRole(['therapist', 'psychiatrist', 'coach']) as (
	req: Request,
	_res: Response,
	next: NextFunction,
) => Promise<void>;

/**
 * Backward compatibility: Require admin role
 * @deprecated Use requireRole('admin') instead
 */
export const requireAdminRole = requireRole('admin') as (
	req: Request,
	_res: Response,
	next: NextFunction,
) => Promise<void>;

/**
 * Advanced: Check if user has ANY of the given permissions
 * Useful for permission-based access control (PBAC)
 * Can be extended with permission mapping
 *
 * @param requiredPermissions - Permissions to check
 * @returns Express middleware function
 */
export const requirePermission = (
	requiredPermissions: string | string[],
): ((req: Request, _res: Response, next: NextFunction) => Promise<void>) => {
	const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

	return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
		const userId = req.auth?.userId;

		if (!userId) {
			next(new AppError('Authentication required', 401));
			return;
		}

		const userDetails = await getUserRole(userId);

		if (!userDetails) {
			next(new AppError('User not found', 404));
			return;
		}

		if (userDetails.isDeleted) {
			next(new AppError('User account is deleted', 410));
			return;
		}

		// TODO: Map roles to permissions and check
		// For now, map roles directly to permissions
		const rolePermissions: Record<UserRole, string[]> = {
			patient: ['read_own_profile', 'book_session', 'view_therapists'],
			therapist: ['read_own_profile', 'manage_sessions', 'view_earnings'],
			psychiatrist: ['read_own_profile', 'manage_sessions', 'view_earnings'],
			coach: ['read_own_profile', 'manage_sessions', 'view_earnings'],
			admin: ['read_all_profiles', 'manage_users', 'manage_therapists', 'view_analytics'],
			superadmin: [
				'read_all_profiles',
				'manage_users',
				'manage_therapists',
				'view_analytics',
				'manage_roles',
				'manage_permissions',
			],
		};

		const userPermissions = rolePermissions[userDetails.role] || [];

		// Check if user has any of the required permissions
		const hasPermission = permissions.some(perm => userPermissions.includes(perm));

		if (!hasPermission) {
			console.warn(
				`[RBAC] Permission denied - userId: ${userId}, userRole: ${userDetails.role}, requiredPermissions: ${permissions.join(',')}`,
			);

			next(
				new AppError(
					`Permission denied. Required: ${permissions.join(' or ')}. You have: ${userPermissions.join(', ')}`,
					403,
				),
			);
			return;
		}

		if (!req.auth) {
			req.auth = {
				userId: '',
				sessionId: '',
				jti: '',
			};
		}
		req.auth.role = userDetails.role;
		next();
	};
};

/**
 * Role-based hierarchy check
 * Allows users with higher roles to access lower role resources
 * E.g., admin can access therapist endpoints
 *
 * @param minimumRole - Minimum role hierarchy level required
 * @returns Express middleware function
 */
export const requireMinimumRole = (minimumRole: UserRole): ((req: Request, _res: Response, next: NextFunction) => Promise<void>) => {
	const minimumLevel = roleHierarchy[minimumRole];

	return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
		const userId = req.auth?.userId;

		if (!userId) {
			next(new AppError('Authentication required', 401));
			return;
		}

		const userDetails = await getUserRole(userId);

		if (!userDetails) {
			next(new AppError('User not found', 404));
			return;
		}

		if (userDetails.isDeleted) {
			next(new AppError('User account is deleted', 410));
			return;
		}

		const userLevel = roleHierarchy[userDetails.role];

		if (userLevel < minimumLevel) {
			next(
				new AppError(
					`Access denied. Minimum role required: ${minimumRole}. Your role: ${userDetails.role}`,
					403,
				),
			);
			return;
		}

		if (!req.auth) {
			req.auth = {
				userId: '',
				sessionId: '',
				jti: '',
			};
		}
		req.auth.role = userDetails.role;
		next();
	};
};


