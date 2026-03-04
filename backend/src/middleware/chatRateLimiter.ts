import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from './error.middleware';

const db = prisma as any;

const isPremiumPlan = (planName: string | null | undefined): boolean => {
	const normalized = String(planName || '').toLowerCase();
	return normalized.includes('premium') || normalized.includes('pro');
};

const startOfDay = (date: Date): Date => {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
};

export const chatRateLimiter = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
	try {
		const userId = req.auth?.userId;
		const role = String(req.auth?.role || '').toLowerCase();
		if (!userId) {
			next(new AppError('Authentication required', 401));
			return;
		}

		if (['therapist', 'psychiatrist', 'coach', 'provider', 'admin', 'superadmin'].includes(role)) {
			next();
			return;
		}

		const subscription = await db.patientSubscription.findUnique({ where: { userId } }).catch(() => null);
		const premium = isPremiumPlan(subscription?.planName);
		if (premium) {
			next();
			return;
		}

		const todayStart = startOfDay(new Date());
		let usage = 0;
		try {
			usage = await db.chatMessage.count({
				where: {
					userId,
					role: 'assistant',
					timestamp: { gte: todayStart },
				},
			});
		} catch {
			usage = await db.aIConversation.count({
				where: {
					userId,
					createdAt: { gte: todayStart },
				},
			});
		}

		if (usage >= 3) {
			next(new AppError('Daily AI chat limit reached for free tier (3/day). Upgrade to Premium for unlimited access.', 429));
			return;
		}

		next();
	} catch (error) {
		next(new AppError(`Chat rate limiter failed: ${String(error)}`, 500));
	}
};
