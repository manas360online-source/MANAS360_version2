import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { createMarketplaceSubscription } from '../services/subscription.service';

const db = prisma as any;

const getAuthUserId = (req: Request): string => {
	const userId = req.auth?.userId;
	if (!userId) {
		throw new AppError('Authentication required', 401);
	}
	return userId;
};

export const createSubscriptionController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const domain = String(req.body.domain ?? '').toUpperCase();
	const plan = String(req.body.plan ?? '').toUpperCase();
	const razorpayPlanId = String(req.body.razorpayPlanId ?? '').trim();

	if (!['PATIENT', 'PROVIDER'].includes(domain)) {
		throw new AppError('domain must be PATIENT or PROVIDER', 422);
	}

	if (!['BASIC', 'PREMIUM', 'LEAD_PLAN'].includes(plan)) {
		throw new AppError('plan must be BASIC, PREMIUM or LEAD_PLAN', 422);
	}

	if (!razorpayPlanId) {
		throw new AppError('razorpayPlanId is required', 422);
	}

	const created = await createMarketplaceSubscription({
		userId,
		domain: domain as 'PATIENT' | 'PROVIDER',
		plan: plan as 'BASIC' | 'PREMIUM' | 'LEAD_PLAN',
		razorpayPlanId,
	});

	sendSuccess(res, created, 'Subscription created', 201);
};

export const getMySubscriptionsController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	const subscriptions = await db.marketplaceSubscription.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
	});

	sendSuccess(res, subscriptions, 'Subscriptions fetched');
};

