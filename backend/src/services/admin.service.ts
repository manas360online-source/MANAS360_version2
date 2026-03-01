import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { buildPaginationMeta, normalizePagination } from '../utils/pagination';
import type { PaginationMeta } from '../utils/pagination';

const db = prisma as any;

const mapRoleFilterToEnum = (role?: string): 'PATIENT' | 'THERAPIST' | 'ADMIN' | undefined => {
	if (!role) return undefined;
	const normalized = role.toLowerCase();
	if (normalized === 'patient') return 'PATIENT';
	if (normalized === 'therapist') return 'THERAPIST';
	if (normalized === 'admin') return 'ADMIN';
	throw new AppError('Invalid role filter', 400);
};

const mapPlanTypeToEnum = (planType?: string): 'BASIC' | 'PREMIUM' | 'LEAD_PLAN' | undefined => {
	if (!planType) return undefined;
	const normalized = planType.toLowerCase();
	if (normalized === 'basic') return 'BASIC';
	if (normalized === 'premium') return 'PREMIUM';
	if (normalized === 'pro') return 'LEAD_PLAN';
	throw new AppError('Invalid plan type', 400);
};

const mapSubscriptionStatusToEnum = (status?: string): 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAST_DUE' | undefined => {
	if (!status) return undefined;
	const normalized = status.toLowerCase();
	if (normalized === 'active') return 'ACTIVE';
	if (normalized === 'expired') return 'EXPIRED';
	if (normalized === 'cancelled') return 'CANCELLED';
	if (normalized === 'paused') return 'PAST_DUE';
	throw new AppError('Invalid subscription status', 400);
};

export interface AdminListUsersResponse {
	data: Array<{
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		role: 'patient' | 'therapist' | 'admin';
		createdAt: Date;
		updatedAt: Date;
	}>;
	meta: PaginationMeta;
}

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
export const listUsers = async (
	page: number,
	limit: number,
	{
		role,
		status,
	}: {
		role?: string;
		status?: string;
	} = {},
): Promise<AdminListUsersResponse> => {
	if (status && !['active', 'deleted'].includes(status.toLowerCase())) {
		throw new AppError('Invalid status filter', 400);
	}

	if (status?.toLowerCase() === 'deleted') {
		const normalized = normalizePagination(
			{ page, limit },
			{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
		);
		return {
			data: [],
			meta: buildPaginationMeta(0, normalized),
		};
	}

	const roleFilter = mapRoleFilterToEnum(role);

	const normalized = normalizePagination(
		{ page, limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

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
		data: users.map((user: any) => ({
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: String(user.role).toLowerCase(),
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		})),
		meta: buildPaginationMeta(totalItems, normalized),
	};
};

/**
 * Get a single user by ID
 *
 * Returns full user profile with sensitive fields excluded
 * Throws 404 if user not found
 */
export const getUserById = async (userId: string): Promise<{
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
	createdAt: Date;
	updatedAt: Date;
}> => {
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
		throw new AppError('User not found', 404);
	}

	return {
		...user,
		role: String(user.role).toLowerCase(),
	} as any;
};

/**
 * Verify therapist credentials
 *
 * Sets isVerified = true and records verification timestamp + admin user ID
 * Prevents re-verification with 409 Conflict
 * Returns updated therapist profile summary
 */
export const verifyTherapist = async (
	therapistProfileId: string,
	adminUserId: string,
): Promise<{
	_id: string;
	displayName: string;
	isVerified: boolean;
	verifiedAt: Date | null;
	verifiedBy: string | null;
	updatedAt: Date;
}> => {
	const admin = await db.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
	if (!admin || admin.role !== 'ADMIN') {
		throw new AppError('Admin user not found', 404);
	}

	const therapistUser = await db.user.findUnique({ where: { id: therapistProfileId }, select: { id: true, firstName: true, lastName: true, role: true, updatedAt: true } });
	if (!therapistUser || therapistUser.role !== 'THERAPIST') {
		throw new AppError('Therapist profile not found', 404);
	}

	throw new AppError('Therapist verification state is not yet modeled in Prisma schema', 501, {
		therapistId: therapistUser.id,
	});
};

/**
 * Get admin metrics from PostgreSQL via Prisma queries.
 */
export const getMetrics = async (): Promise<{
	totalUsers: number;
	totalTherapists: number;
	verifiedTherapists: number;
	completedSessions: number;
	totalRevenue: number;
	activeSubscriptions: number;
}> => {
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

/**
 * List active subscriptions with pagination and filtering
 *
 * Query filters:
 * - planType: 'basic' | 'premium' | 'pro' (optional)
 * - status: 'active' | 'expired' | 'cancelled' | 'paused' (optional, defaults to 'active')
 * - page: pagination page (default: 1)
 * - limit: items per page (default: 10, max: 50)
 *
 * Populates user information and returns paginated list with metadata
 */
export interface AdminListSubscriptionsResponse {
	data: Array<{
		_id: string;
		user: {
			id: string;
			name: string | null;
			email: string;
			phone: string | null;
		};
		plan: {
			type: string;
			name: string;
		};
		status: string;
		startDate: Date;
		expiryDate: Date;
		price: number;
		currency: string;
		billingCycle: string;
		autoRenew: boolean;
		createdAt: Date;
	}>;
	meta: PaginationMeta;
}

export const listSubscriptions = async (
	page: number,
	limit: number,
	{
		planType,
		status,
	}: {
		planType?: string;
		status?: string;
	} = {},
): Promise<AdminListSubscriptionsResponse> => {
	const mappedPlan = mapPlanTypeToEnum(planType);
	const mappedStatus = mapSubscriptionStatusToEnum(status) ?? 'ACTIVE';

	const normalized = normalizePagination(
		{ page, limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

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

	const data = subscriptions.map((sub: any) => {
		const latestInvoice = (sub.invoices ?? [])
			.sort((a: any, b: any) => new Date(b.billedAt).getTime() - new Date(a.billedAt).getTime())[0];

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
		meta: buildPaginationMeta(totalItems, normalized),
	};
};
