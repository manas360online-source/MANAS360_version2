import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { buildPaginationMeta, normalizePagination } from '../utils/pagination';
import { createRazorpayOrder, verifyRazorpayPaymentSignature } from './razorpay.service';
import { randomUUID } from 'crypto';

const db = prisma as any;

interface TherapistLeadsQuery {
	status?: 'available' | 'purchased';
	page: number;
	limit: number;
}

const assertTherapistUser = async (userId: string): Promise<void> => {
	const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (String(user.role) !== 'THERAPIST') {
		throw new AppError('Therapist role required', 403);
	}
};

export const getMyTherapistLeads = async (userId: string, query: TherapistLeadsQuery) => {
	await assertTherapistUser(userId);

	const pagination = normalizePagination(
		{ page: query.page, limit: query.limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const where = query.status
		? query.status === 'available'
			? { OR: [{ status: 'AVAILABLE', providerId: null }, { status: 'AVAILABLE', providerId: userId, paymentStatus: 'INITIATED' }] }
			: { status: 'PURCHASED', providerId: userId }
		: {
			OR: [
				{ status: 'AVAILABLE', providerId: null },
				{ status: 'AVAILABLE', providerId: userId, paymentStatus: 'INITIATED' },
				{ status: 'PURCHASED', providerId: userId },
			],
		};

	const [total, leads] = await Promise.all([
		db.lead.count({ where }),
		db.lead.findMany({
			where,
			orderBy: [{ createdAt: 'desc' }],
			skip: pagination.skip,
			take: pagination.limit,
			select: {
				id: true,
				status: true,
				paymentStatus: true,
				razorpayOrderId: true,
				matchScore: true,
				amountMinor: true,
				currency: true,
				previewData: true,
				patientAcceptanceUntil: true,
				providerContactedAt: true,
				purchasedAt: true,
				createdAt: true,
				patientId: true,
				providerId: true,
			},
		}),
	]);

	return {
		items: leads,
		meta: buildPaginationMeta(total, pagination),
	};
};

export const initiateMyTherapistLeadPurchase = async (userId: string, leadId: string) => {
	await assertTherapistUser(userId);

	const now = new Date();

	const reservedLead = await db.$transaction(async (tx: any) => {
		const lead = await tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				status: true,
				providerId: true,
				amountMinor: true,
				currency: true,
				expiresAt: true,
				patientAcceptanceUntil: true,
				paymentStatus: true,
				razorpayOrderId: true,
			},
		});

		if (!lead) {
			throw new AppError('Lead not found', 404, { leadId });
		}

		if (lead.status === 'PURCHASED' && lead.providerId === userId) {
			return lead;
		}

		if (lead.status !== 'AVAILABLE') {
			throw new AppError('Lead is no longer available', 409, { leadId, status: lead.status });
		}

		if (lead.patientAcceptanceUntil && lead.patientAcceptanceUntil < now) {
			throw new AppError('Lead acceptance window has expired', 409, { leadId });
		}

		if (lead.expiresAt && lead.expiresAt < now) {
			throw new AppError('Lead has expired', 409, { leadId });
		}

		if (lead.providerId && lead.providerId !== userId) {
			throw new AppError('Lead is reserved by another therapist', 409, { leadId });
		}

		const reserve = await tx.lead.updateMany({
			where: {
				id: leadId,
				status: 'AVAILABLE',
				OR: [{ providerId: null }, { providerId: userId }],
			},
			data: {
				providerId: userId,
				paymentStatus: 'INITIATED',
				idempotencyKey: randomUUID(),
			},
		});

		if (reserve.count !== 1) {
			throw new AppError('Lead is no longer available', 409, { leadId });
		}

		return tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				amountMinor: true,
				currency: true,
				providerId: true,
				status: true,
				paymentStatus: true,
				razorpayOrderId: true,
			},
		});
	});

	if (!reservedLead) {
		throw new AppError('Unable to reserve lead for payment', 409, { leadId });
	}

	if (!env.razorpayKeyId || !env.razorpayKeySecret) {
		throw new AppError('Razorpay credentials are not configured', 500);
	}

	const order = await createRazorpayOrder({
		amountMinor: Number(reservedLead.amountMinor),
		currency: String(reservedLead.currency ?? 'INR'),
		receipt: `lead_${Date.now()}_${leadId.slice(0, 8)}`,
		notes: {
			leadId,
			therapistId: userId,
			flow: 'lead_purchase',
		},
	});

	await db.lead.updateMany({
		where: {
			id: leadId,
			providerId: userId,
			status: 'AVAILABLE',
			paymentStatus: 'INITIATED',
		},
		data: {
			razorpayOrderId: order.id,
		},
	});

	return {
		leadId,
		paymentRequired: true,
		amountMinor: Number(reservedLead.amountMinor),
		currency: String(reservedLead.currency ?? 'INR'),
		razorpayOrderId: order.id,
		razorpayKeyId: env.razorpayKeyId,
	};
};

export const confirmMyTherapistLeadPurchase = async (
	userId: string,
	leadId: string,
	input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
) => {
	await assertTherapistUser(userId);

	if (!env.razorpayKeySecret) {
		throw new AppError('Razorpay credentials are not configured', 500);
	}

	const isValid = verifyRazorpayPaymentSignature(
		input.razorpayOrderId,
		input.razorpayPaymentId,
		input.razorpaySignature,
		env.razorpayKeySecret,
	);

	if (!isValid) {
		throw new AppError('Invalid Razorpay payment signature', 401);
	}

	const now = new Date();

	const result = await db.$transaction(async (tx: any) => {
		const lead = await tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				status: true,
				providerId: true,
				amountMinor: true,
				currency: true,
				paymentStatus: true,
				razorpayOrderId: true,
				razorpayPaymentId: true,
			},
		});

		if (!lead) {
			throw new AppError('Lead not found', 404, { leadId });
		}

		if (lead.providerId !== userId) {
			throw new AppError('Lead is reserved by another therapist', 403, { leadId });
		}

		if (lead.razorpayOrderId !== input.razorpayOrderId) {
			throw new AppError('Order id does not match reserved lead', 409, { leadId });
		}

		if (lead.status === 'PURCHASED' && lead.paymentStatus === 'CAPTURED') {
			return {
				id: lead.id,
				status: lead.status,
				paymentStatus: lead.paymentStatus,
				providerId: lead.providerId,
				amountMinor: lead.amountMinor,
				currency: lead.currency,
				razorpayOrderId: lead.razorpayOrderId,
				razorpayPaymentId: lead.razorpayPaymentId,
			};
		}

		const update = await tx.lead.updateMany({
			where: {
				id: leadId,
				providerId: userId,
				status: 'AVAILABLE',
				paymentStatus: 'INITIATED',
				razorpayOrderId: input.razorpayOrderId,
			},
			data: {
				status: 'PURCHASED',
				paymentStatus: 'CAPTURED',
				razorpayPaymentId: input.razorpayPaymentId,
				paymentCapturedAt: now,
				purchasedAt: now,
			},
		});

		if (update.count !== 1) {
			throw new AppError('Lead payment confirmation conflict', 409, { leadId });
		}

		await tx.revenueLedger.create({
			data: {
				type: 'CONTENT',
				grossAmountMinor: lead.amountMinor,
				platformCommissionMinor: lead.amountMinor,
				providerShareMinor: 0,
				taxAmountMinor: 0,
				currency: lead.currency,
				referenceId: `lead:${lead.id}`,
			},
		});

		return tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				status: true,
				paymentStatus: true,
				providerId: true,
				purchasedAt: true,
				amountMinor: true,
				currency: true,
				razorpayOrderId: true,
				razorpayPaymentId: true,
			},
		});
	});

	return {
		lead: result,
	};
};

export const purchaseMyTherapistLead = async (userId: string, leadId: string) => {
	await assertTherapistUser(userId);

	const now = new Date();

	const purchasedLead = await db.$transaction(async (tx: any) => {
		const lead = await tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				status: true,
				providerId: true,
				expiresAt: true,
				patientAcceptanceUntil: true,
			},
		});

		if (!lead) {
			throw new AppError('Lead not found', 404, { leadId });
		}

		if (lead.status !== 'AVAILABLE') {
			throw new AppError('Lead is no longer available', 409, { leadId, status: lead.status });
		}

		if (lead.patientAcceptanceUntil && lead.patientAcceptanceUntil < now) {
			throw new AppError('Lead acceptance window has expired', 409, { leadId });
		}

		if (lead.expiresAt && lead.expiresAt < now) {
			throw new AppError('Lead has expired', 409, { leadId });
		}

		const updateResult = await tx.lead.updateMany({
			where: {
				id: leadId,
				status: 'AVAILABLE',
				providerId: null,
			},
			data: {
				providerId: userId,
				status: 'PURCHASED',
				purchasedAt: now,
			},
		});

		if (updateResult.count !== 1) {
			throw new AppError('Lead is no longer available', 409, { leadId });
		}

		return tx.lead.findUnique({
			where: { id: leadId },
			select: {
				id: true,
				status: true,
				providerId: true,
				purchasedAt: true,
				amountMinor: true,
				currency: true,
				patientId: true,
			},
		});
	});

	return {
		lead: purchasedLead,
	};
};
