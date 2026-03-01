"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireMinimumRole = exports.requirePermission = exports.requireAdminRole = exports.requireTherapistRole = exports.requirePatientRole = exports.requireRole = exports.clearRoleCache = exports.roleHierarchy = void 0;
const db_1 = require("../config/db");
const error_middleware_1 = require("./error.middleware");
const db = db_1.prisma;
/**
 * Role hierarchy for logical grouping
 * Useful for future permission inheritance
 */
exports.roleHierarchy = {
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
const roleCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Clear role cache (useful after role updates)
 */
const clearRoleCache = (userId) => {
    if (userId) {
        roleCache.delete(userId);
    }
    else {
        roleCache.clear();
    }
};
exports.clearRoleCache = clearRoleCache;
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
const getUserRole = async (userId) => {
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
        role: String(user.role).toLowerCase(),
        timestamp: Date.now(),
        isDeleted: false,
    });
    return {
        role: String(user.role).toLowerCase(),
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
const requireRole = (allowedRoles) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    // Validate allowed roles at middleware creation time (defense in depth)
    const validRoles = Object.keys(exports.roleHierarchy);
    for (const role of roles) {
        if (!validRoles.includes(role)) {
            throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
        }
    }
    return async (req, _res, next) => {
        try {
            // Extract user ID from JWT (populated by requireAuth middleware)
            const userId = req.auth?.userId;
            if (!userId) {
                next(new error_middleware_1.AppError('Authentication required', 401));
                return;
            }
            // Get user role with caching
            const userDetails = await getUserRole(userId);
            // User not found in database
            if (!userDetails) {
                next(new error_middleware_1.AppError('User not found', 404));
                return;
            }
            // User account is deleted
            if (userDetails.isDeleted) {
                next(new error_middleware_1.AppError('User account is deleted. Please contact support.', 410));
                return;
            }
            // Check if user's role is in allowed roles
            if (!roles.includes(userDetails.role)) {
                // Log unauthorized attempt for security audit
                console.warn(`[RBAC] Unauthorized access attempt - userId: ${userId}, userRole: ${userDetails.role}, requiredRoles: ${roles.join(',')}`);
                next(new error_middleware_1.AppError(`Access denied. Required role(s): ${roles.join(' or ')}. Your role: ${userDetails.role}`, 403));
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
        }
        catch (error) {
            // Fail securely on unexpected errors
            console.error('[RBAC] Error during role verification:', error);
            next(new error_middleware_1.AppError('Authorization failed', 500));
        }
    };
};
exports.requireRole = requireRole;
/**
 * Backward compatibility: Require patient role
 * @deprecated Use requireRole('patient') instead
 */
exports.requirePatientRole = (0, exports.requireRole)('patient');
/**
 * Backward compatibility: Require therapist role
 * @deprecated Use requireRole('therapist') instead
 */
exports.requireTherapistRole = (0, exports.requireRole)('therapist');
/**
 * Backward compatibility: Require admin role
 * @deprecated Use requireRole('admin') instead
 */
exports.requireAdminRole = (0, exports.requireRole)('admin');
/**
 * Advanced: Check if user has ANY of the given permissions
 * Useful for permission-based access control (PBAC)
 * Can be extended with permission mapping
 *
 * @param requiredPermissions - Permissions to check
 * @returns Express middleware function
 */
const requirePermission = (requiredPermissions) => {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    return async (req, _res, next) => {
        const userId = req.auth?.userId;
        if (!userId) {
            next(new error_middleware_1.AppError('Authentication required', 401));
            return;
        }
        const userDetails = await getUserRole(userId);
        if (!userDetails) {
            next(new error_middleware_1.AppError('User not found', 404));
            return;
        }
        if (userDetails.isDeleted) {
            next(new error_middleware_1.AppError('User account is deleted', 410));
            return;
        }
        // TODO: Map roles to permissions and check
        // For now, map roles directly to permissions
        const rolePermissions = {
            patient: ['read_own_profile', 'book_session', 'view_therapists'],
            therapist: ['read_own_profile', 'manage_sessions', 'view_earnings'],
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
            console.warn(`[RBAC] Permission denied - userId: ${userId}, userRole: ${userDetails.role}, requiredPermissions: ${permissions.join(',')}`);
            next(new error_middleware_1.AppError(`Permission denied. Required: ${permissions.join(' or ')}. You have: ${userPermissions.join(', ')}`, 403));
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
exports.requirePermission = requirePermission;
/**
 * Role-based hierarchy check
 * Allows users with higher roles to access lower role resources
 * E.g., admin can access therapist endpoints
 *
 * @param minimumRole - Minimum role hierarchy level required
 * @returns Express middleware function
 */
const requireMinimumRole = (minimumRole) => {
    const minimumLevel = exports.roleHierarchy[minimumRole];
    return async (req, _res, next) => {
        const userId = req.auth?.userId;
        if (!userId) {
            next(new error_middleware_1.AppError('Authentication required', 401));
            return;
        }
        const userDetails = await getUserRole(userId);
        if (!userDetails) {
            next(new error_middleware_1.AppError('User not found', 404));
            return;
        }
        if (userDetails.isDeleted) {
            next(new error_middleware_1.AppError('User account is deleted', 410));
            return;
        }
        const userLevel = exports.roleHierarchy[userDetails.role];
        if (userLevel < minimumLevel) {
            next(new error_middleware_1.AppError(`Access denied. Minimum role required: ${minimumRole}. Your role: ${userDetails.role}`, 403));
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
exports.requireMinimumRole = requireMinimumRole;
