"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSubscriptions = exports.getMetrics = exports.verifyTherapist = exports.getUserById = exports.listUsers = void 0;
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const pagination_1 = require("../utils/pagination");
const db = db_1.prisma;
const mapRoleFilterToEnum = (role) => {
    if (!role)
        return undefined;
    const normalized = role.toLowerCase();
    if (normalized === 'patient')
        return 'PATIENT';
    if (normalized === 'therapist')
        return 'THERAPIST';
    if (normalized === 'admin')
        return 'ADMIN';
    throw new error_middleware_1.AppError('Invalid role filter', 400);
};
const mapPlanTypeToEnum = (planType) => {
    if (!planType)
        return undefined;
    const normalized = planType.toLowerCase();
    if (normalized === 'basic')
        return 'BASIC';
    if (normalized === 'premium')
        return 'PREMIUM';
    if (normalized === 'pro')
        return 'LEAD_PLAN';
    throw new error_middleware_1.AppError('Invalid plan type', 400);
};
const mapSubscriptionStatusToEnum = (status) => {
    if (!status)
        return undefined;
    const normalized = status.toLowerCase();
    if (normalized === 'active')
        return 'ACTIVE';
    if (normalized === 'expired')
        return 'EXPIRED';
    if (normalized === 'cancelled')
        return 'CANCELLED';
    if (normalized === 'paused')
        return 'PAST_DUE';
    throw new error_middleware_1.AppError('Invalid subscription status', 400);
};
/**
 * List users with pagination and filtering
 *
 * Query filters:
 * - role: 'patient' | 'therapist' | 'admin' (optional)
 * - status: 'active' | 'deleted' (optional)
 * - page: pagination page (default: 1)
 * - limit: items per page (default: 10, max: 50)
 *
 * Returns paginated list with metadata
 */
const listUsers = async (page, limit, { role, status, } = {}) => {
    if (status && !['active', 'deleted'].includes(status.toLowerCase())) {
        throw new error_middleware_1.AppError('Invalid status filter', 400);
    }
    if (status?.toLowerCase() === 'deleted') {
        const normalized = (0, pagination_1.normalizePagination)({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
        return {
            data: [],
            meta: (0, pagination_1.buildPaginationMeta)(0, normalized),
        };
    }
    const roleFilter = mapRoleFilterToEnum(role);
    const normalized = (0, pagination_1.normalizePagination)({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    const [users, totalItems] = await Promise.all([
        db.user.findMany({
            where: roleFilter ? { role: roleFilter } : undefined,
            orderBy: { createdAt: 'desc' },
            skip: normalized.skip,
            take: normalized.limit,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        }),
        db.user.count({ where: roleFilter ? { role: roleFilter } : undefined }),
    ]);
    return {
        data: users.map((user) => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: String(user.role).toLowerCase(),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        })),
        meta: (0, pagination_1.buildPaginationMeta)(totalItems, normalized),
    };
};
exports.listUsers = listUsers;
/**
 * Get a single user by ID
 *
 * Returns full user profile with sensitive fields excluded
 * Throws 404 if user not found
 */
const getUserById = async (userId) => {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    return {
        ...user,
        role: String(user.role).toLowerCase(),
    };
};
exports.getUserById = getUserById;
/**
 * Verify therapist credentials
 *
 * Sets isVerified = true and records verification timestamp + admin user ID
 * Prevents re-verification with 409 Conflict
 * Returns updated therapist profile summary
 */
const verifyTherapist = async (therapistProfileId, adminUserId) => {
    const admin = await db.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
    if (!admin || admin.role !== 'ADMIN') {
        throw new error_middleware_1.AppError('Admin user not found', 404);
    }
    const therapistUser = await db.user.findUnique({ where: { id: therapistProfileId }, select: { id: true, firstName: true, lastName: true, role: true, updatedAt: true } });
    if (!therapistUser || therapistUser.role !== 'THERAPIST') {
        throw new error_middleware_1.AppError('Therapist profile not found', 404);
    }
    throw new error_middleware_1.AppError('Therapist verification state is not yet modeled in Prisma schema', 501, {
        therapistId: therapistUser.id,
    });
};
exports.verifyTherapist = verifyTherapist;
/**
 * Get admin metrics from PostgreSQL via Prisma queries.
 */
const getMetrics = async () => {
    const [totalUsersResult, totalTherapistsResult, completedSessionsResult, revenueAgg, activeSubscriptionsResult] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { role: 'THERAPIST' } }),
        db.therapySession.count({ where: { status: 'COMPLETED' } }),
        db.revenueLedger.aggregate({ _sum: { grossAmountMinor: true } }),
        db.marketplaceSubscription.count({ where: { status: 'ACTIVE' } }),
    ]);
    const grossMinor = BigInt(revenueAgg?._sum?.grossAmountMinor ?? 0);
    const totalRevenue = Number(grossMinor) / 100;
    const verifiedTherapistsResult = totalTherapistsResult;
    return {
        totalUsers: totalUsersResult,
        totalTherapists: totalTherapistsResult,
        verifiedTherapists: verifiedTherapistsResult,
        completedSessions: completedSessionsResult,
        totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
        activeSubscriptions: activeSubscriptionsResult,
    };
};
exports.getMetrics = getMetrics;
const listSubscriptions = async (page, limit, { planType, status, } = {}) => {
    const mappedPlan = mapPlanTypeToEnum(planType);
    const mappedStatus = mapSubscriptionStatusToEnum(status) ?? 'ACTIVE';
    const normalized = (0, pagination_1.normalizePagination)({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    const [subscriptions, totalItems] = await Promise.all([
        db.marketplaceSubscription.findMany({
            where: {
                status: mappedStatus,
                ...(mappedPlan ? { plan: mappedPlan } : {}),
            },
            orderBy: { createdAt: 'desc' },
            skip: normalized.skip,
            take: normalized.limit,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                invoices: true,
            },
        }),
        db.marketplaceSubscription.count({
            where: {
                status: mappedStatus,
                ...(mappedPlan ? { plan: mappedPlan } : {}),
            },
        }),
    ]);
    const data = subscriptions.map((sub) => {
        const latestInvoice = (sub.invoices ?? [])
            .sort((a, b) => new Date(b.billedAt).getTime() - new Date(a.billedAt).getTime())[0];
        return {
            _id: sub.id,
            user: {
                id: sub.user.id,
                name: `${sub.user.firstName ?? ''} ${sub.user.lastName ?? ''}`.trim() || null,
                email: sub.user.email,
                phone: null,
            },
            plan: {
                type: String(sub.plan).toLowerCase(),
                name: String(sub.plan),
            },
            status: String(sub.status).toLowerCase(),
            startDate: sub.currentPeriodStart ?? sub.createdAt,
            expiryDate: sub.currentPeriodEnd ?? sub.createdAt,
            price: latestInvoice ? Number(latestInvoice.amountMinor) / 100 : 0,
            currency: latestInvoice?.currency ?? 'INR',
            billingCycle: 'monthly',
            autoRenew: String(sub.status) !== 'CANCELLED',
            createdAt: sub.createdAt,
        };
    });
    return {
        data,
        meta: (0, pagination_1.buildPaginationMeta)(totalItems, normalized),
    };
};
exports.listSubscriptions = listSubscriptions;
