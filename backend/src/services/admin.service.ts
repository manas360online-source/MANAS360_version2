import UserModel, { type UserDocument } from '../models/user.model';
import TherapistProfileModel from '../models/therapist.model';
import TherapySessionModel from '../models/therapy-session.model';
import { prisma } from '../config/db';
import WalletTransactionModel from '../models/wallet-transaction.model';
import SubscriptionModel, { type SubscriptionDocument } from '../models/subscription.model';
import { AppError } from '../middleware/error.middleware';
import { buildPaginationMeta, normalizePagination } from '../utils/pagination';
import type { PaginationMeta } from '../utils/pagination';

/**
 * Projection for safe user data (excludes sensitive fields)
 * Excludes: passwordHash, tokens, verification OTPs, MFA secret, etc.
 */
const safeUserProjection = {
	passwordHash: 0,
	emailVerificationOtpHash: 0,
	emailVerificationOtpExpiresAt: 0,
	phoneVerificationOtpHash: 0,
	phoneVerificationOtpExpiresAt: 0,
	passwordResetOtpHash: 0,
	passwordResetOtpExpiresAt: 0,
	mfaSecret: 0,
	refreshTokens: 0,
} as const;

export interface AdminListUsersResponse {
	data: Omit<UserDocument, keyof typeof safeUserProjection>[];
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
	// Build filter query
	const filter: Record<string, unknown> = {};

	// Apply role filter (case-insensitive)
	if (role) {
		if (!['patient', 'therapist', 'admin'].includes(role.toLowerCase())) {
			throw new AppError('Invalid role filter', 400);
		}
		filter.role = role.toLowerCase();
	}

	// Apply status filter
	// "active" = isDeleted: false (default)
	// "deleted" = isDeleted: true
	if (status) {
		if (status.toLowerCase() === 'deleted') {
			filter.isDeleted = true;
		} else if (status.toLowerCase() === 'active') {
			filter.isDeleted = false;
		} else {
			throw new AppError('Invalid status filter', 400);
		}
	} else {
		// Default to active users only
		filter.isDeleted = false;
	}

	// Normalize pagination
	const normalized = normalizePagination(
		{ page, limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	// Execute parallel queries for data and total count
	const [users, totalItems] = await Promise.all([
		UserModel.find(filter, safeUserProjection)
			.sort({ createdAt: -1 }) // Sort by newest first
			.skip(normalized.skip)
			.limit(normalized.limit)
			.lean(),
		UserModel.countDocuments(filter),
	]);

	return {
		data: users,
		meta: buildPaginationMeta(totalItems, normalized),
	};
};

/**
 * Get a single user by ID
 *
 * Returns full user profile with sensitive fields excluded
 * Throws 404 if user not found
 */
export const getUserById = async (userId: string): Promise<Omit<UserDocument, keyof typeof safeUserProjection>> => {
	const user = await UserModel.findById(userId, safeUserProjection).lean();

	if (!user) {
		throw new AppError('User not found', 404);
	}

	return user as Omit<UserDocument, keyof typeof safeUserProjection>;
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
	// Validate therapist profile exists
	const therapistProfile = await TherapistProfileModel.findById(therapistProfileId).select(
		'_id displayName isVerified verifiedAt verifiedBy userId',
	);

	if (!therapistProfile) {
		throw new AppError('Therapist profile not found', 404);
	}

	// Prevent re-verification
	if (therapistProfile.isVerified === true) {
		throw new AppError('Therapist is already verified', 409);
	}

	// Update therapist profile with verification details
	const now = new Date();
	const updatedProfile = await TherapistProfileModel.findByIdAndUpdate(
		therapistProfileId,
		{
			$set: {
				isVerified: true,
				verifiedAt: now,
				verifiedBy: adminUserId,
				updatedAt: now,
			},
		},
		{
			new: true,
			runValidators: true,
			select: '_id displayName isVerified verifiedAt verifiedBy updatedAt',
		},
	).lean();

	if (!updatedProfile) {
		throw new AppError('Failed to update therapist profile', 500);
	}

	return {
		_id: updatedProfile._id.toString(),
		displayName: updatedProfile.displayName,
		isVerified: updatedProfile.isVerified,
		verifiedAt: updatedProfile.verifiedAt ?? null,
		verifiedBy: updatedProfile.verifiedBy?.toString() ?? null,
		updatedAt: updatedProfile.updatedAt,
	};
};

/**
 * Get admin metrics using MongoDB aggregation pipelines
 *
 * Returns comprehensive platform metrics:
 * - totalUsers: Count of all users (active only)
 * - totalTherapists: Count of therapist profiles
 * - verifiedTherapists: Count of verified therapists
 * - completedSessions: Count of completed therapy sessions
 * - totalRevenue: Sum of all wallet transaction amounts (in base currency)
 * - activeSubscriptions: Count of therapists with active status (verified + non-deleted)
 *
 * Performance: Uses lean() queries and efficient aggregation pipelines
 * Leverages indexes on role, isDeleted, isVerified, status fields
 */
export const getMetrics = async (): Promise<{
	totalUsers: number;
	totalTherapists: number;
	verifiedTherapists: number;
	completedSessions: number;
	totalRevenue: number;
	activeSubscriptions: number;
}> => {
	// Execute all aggregations in parallel for maximum efficiency
	const [totalUsersResult, totalTherapistsResult, verifiedTherapistsResult, completedSessionsResult, totalRevenueResult, activeSubscriptionsResult] =
		await Promise.all([
			// Total active users (non-deleted)
			UserModel.countDocuments({ isDeleted: false }),

			// Total therapist profiles (non-deleted)
			TherapistProfileModel.countDocuments({ deletedAt: null }),

			// Verified therapists (isVerified = true, non-deleted)
			TherapistProfileModel.countDocuments({ isVerified: true, deletedAt: null }),

			// Completed therapy sessions
			prisma.therapySession.count({ where: { status: 'COMPLETED' } }),

			// Total revenue - aggregate sum of all wallet transactions
			WalletTransactionModel.aggregate([
				{
					$group: {
						_id: null,
						totalAmount: { $sum: '$amount' },
					},
				},
				{
					$project: {
						_id: 0,
						totalAmount: 1,
					},
				},
			]),

			// Active subscriptions - therapists with complete profiles (verified + active)
			TherapistProfileModel.countDocuments({ isVerified: true, deletedAt: null, currentActivePatients: { $gt: 0 } }),
		]);

	// Extract revenue from aggregation result (returns array with single object)
	const totalRevenueData = totalRevenueResult as Array<{ totalAmount: number }>;
	const totalRevenue = totalRevenueData.length > 0 ? totalRevenueData[0].totalAmount : 0;

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
	// Build filter query
	const filter: Record<string, unknown> = {};

	// Apply planType filter
	if (planType) {
		if (!['basic', 'premium', 'pro'].includes(planType.toLowerCase())) {
			throw new AppError('Invalid plan type', 400);
		}
		filter.planType = planType.toLowerCase();
	}

	// Apply status filter
	// Default to 'active' if not specified
	if (status) {
		if (!['active', 'expired', 'cancelled', 'paused'].includes(status.toLowerCase())) {
			throw new AppError('Invalid subscription status', 400);
		}
		filter.status = status.toLowerCase();
	} else {
		// Default to active subscriptions only
		filter.status = 'active';
	}

	// Normalize pagination
	const normalized = normalizePagination(
		{ page, limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	// Execute parallel queries for data and total count
	const [subscriptions, totalItems] = await Promise.all([
		SubscriptionModel.find(filter)
			.populate('userId', 'name email phone')
			.select('_id userId planType planName status startDate expiryDate price currency billingCycle autoRenew createdAt')
			.sort({ createdAt: -1 }) // Sort by newest first
			.skip(normalized.skip)
			.limit(normalized.limit)
			.lean(),
		SubscriptionModel.countDocuments(filter),
	]);

	// Transform response to match expected shape
	const data = subscriptions.map((sub: any) => ({
		_id: sub._id.toString(),
		user: {
			id: sub.userId._id.toString(),
			name: sub.userId.name,
			email: sub.userId.email,
			phone: sub.userId.phone,
		},
		plan: {
			type: sub.planType,
			name: sub.planName,
		},
		status: sub.status,
		startDate: sub.startDate,
		expiryDate: sub.expiryDate,
		price: sub.price,
		currency: sub.currency,
		billingCycle: sub.billingCycle,
		autoRenew: sub.autoRenew,
		createdAt: sub.createdAt,
	}));

	return {
		data,
		meta: buildPaginationMeta(totalItems, normalized),
	};
};
