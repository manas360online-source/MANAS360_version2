import { AppError } from '../middleware/error.middleware';
import UserModel from '../models/user.model';
import TherapistProfileModel from '../models/therapist.model';
import PatientProfileModel from '../models/patient.model';
import TherapistLeadModel from '../models/lead.model';
import { buildPaginationMeta, normalizePagination } from '../utils/pagination';
import mongoose from 'mongoose';
import TherapistWalletModel from '../models/therapist-wallet.model';
import WalletTransactionModel from '../models/wallet-transaction.model';
import { randomUUID } from 'crypto';

interface TherapistLeadsQuery {
	status?: 'available' | 'purchased';
	page: number;
	limit: number;
}

const assertTherapistUser = async (userId: string): Promise<void> => {
	const user = await UserModel.findById(userId).select('_id role isDeleted').lean();

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (user.isDeleted) {
		throw new AppError('User account is deleted', 410);
	}

	if (user.role !== 'therapist') {
		throw new AppError('Therapist role required', 403);
	}
};

export const getMyTherapistLeads = async (userId: string, query: TherapistLeadsQuery) => {
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select({ _id: 1 }).lean();
	if (!therapistProfile) {
		throw new AppError('Therapist profile not found. Please create profile first.', 404);
	}

	const pagination = normalizePagination(
		{ page: query.page, limit: query.limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const filter: {
		therapistId: typeof therapistProfile._id;
		status?: 'available' | 'purchased';
	} = {
		therapistId: therapistProfile._id,
	};

	if (query.status) {
		filter.status = query.status;
	}

	const [totalItems, leads] = await Promise.all([
		TherapistLeadModel.countDocuments(filter),
		((TherapistLeadModel.find(filter)
			.select({
				patientId: 1,
				issueType: 1,
				assessmentSeverity: 1,
				leadPrice: 1,
				status: 1,
				matchedAt: 1,
				purchasedAt: 1,
			})
			.sort({ matchedAt: -1 })
			.skip(pagination.skip)
			.limit(pagination.limit)) as any).lean(),
	]);

	const patientIds = [...new Set((leads as any).map((lead: any) => String(lead.patientId)))];

	const patientProfiles = (await (PatientProfileModel.find({
		_id: { $in: patientIds },
	}).select({ _id: 1, age: 1, gender: 1 }) as any).lean()) as any;

	const patientMap: Map<string, any> = new Map((patientProfiles as any).map((profile: any) => [String(profile._id), profile]));

	const items = (leads as any).map((lead: any) => {
		const patientProfile = patientMap.get(String(lead.patientId)) as any;

		return {
			leadId: String(lead._id),
			patientSummary: {
				patientId: String(lead.patientId),
				age: patientProfile?.age ?? null,
				gender: patientProfile?.gender ?? null,
			},
			issueType: lead.issueType,
			assessmentSeverity: lead.assessmentSeverity,
			leadPrice: lead.leadPrice,
			leadStatus: lead.status,
			matchedAt: lead.matchedAt,
			purchasedAt: lead.purchasedAt,
		};
	});

	return {
		items,
		meta: buildPaginationMeta(totalItems, pagination),
	};
};

export const purchaseMyTherapistLead = async (userId: string, leadId: string) => {
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select({ _id: 1 }).lean();
	if (!therapistProfile) {
		throw new AppError('Therapist profile not found. Please create profile first.', 404);
	}

	const session = await mongoose.startSession();

	try {
		let result: {
			leadId: string;
			leadStatus: 'purchased';
			leadPrice: number;
			walletBalanceAfter: number;
			transactionId: string;
			transactionReferenceId: string;
			purchasedAt: Date;
		} | null = null;

		await session.withTransaction(async () => {
			const lead = await TherapistLeadModel.findOne({ _id: leadId, therapistId: therapistProfile._id })
				.select({ _id: 1, status: 1, leadPrice: 1 })
				.session(session)
				.lean();

			if (!lead) {
				throw new AppError('Lead not found', 404);
			}

			if (lead.status !== 'available') {
				throw new AppError('Lead is not available for purchase', 409, {
					conflictType: 'lead_not_available',
				});
			}

			const wallet = await TherapistWalletModel.findOne({ therapistId: therapistProfile._id })
				.select({ _id: 1, balance: 1, currency: 1 })
				.session(session)
				.lean();

			if (!wallet) {
				throw new AppError('Therapist wallet not found', 404);
			}

			if (wallet.balance < lead.leadPrice) {
				throw new AppError('Insufficient wallet balance', 409, {
					conflictType: 'insufficient_balance',
				});
			}

			const walletUpdate = await TherapistWalletModel.updateOne(
				{
					_id: wallet._id,
					balance: { $gte: lead.leadPrice },
				},
				{
					$inc: { balance: -lead.leadPrice },
				},
				{ session },
			);

			if (walletUpdate.modifiedCount !== 1) {
				throw new AppError('Insufficient wallet balance', 409, {
					conflictType: 'insufficient_balance',
				});
			}

			const purchasedAt = new Date();

			const leadUpdate = await TherapistLeadModel.updateOne(
				{
					_id: lead._id,
					status: 'available',
				},
				{
					$set: {
						status: 'purchased',
						purchasedAt,
					},
				},
				{ session },
			);

			if (leadUpdate.modifiedCount !== 1) {
				throw new AppError('Lead is not available for purchase', 409, {
					conflictType: 'lead_not_available',
				});
			}

			const transactionReferenceId = `LTX-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

			const [transaction] = await WalletTransactionModel.create(
				[
					{
						walletId: wallet._id,
						therapistId: therapistProfile._id,
						leadId: lead._id,
						type: 'lead_purchase',
						amount: lead.leadPrice,
						currency: wallet.currency,
						status: 'success',
						referenceId: transactionReferenceId,
						description: 'Lead purchase debit',
					},
				],
				{ session },
			);

			const updatedWallet = await TherapistWalletModel.findById(wallet._id)
				.select({ balance: 1 })
				.session(session)
				.lean();

			result = {
				leadId: String(lead._id),
				leadStatus: 'purchased',
				leadPrice: lead.leadPrice,
				walletBalanceAfter: updatedWallet?.balance ?? Math.max(0, wallet.balance - lead.leadPrice),
				transactionId: String(transaction._id),
				transactionReferenceId,
				purchasedAt,
			};
		});

		if (!result) {
			throw new AppError('Unable to purchase lead', 500);
		}

		return result;
	} finally {
		await session.endSession();
	}
};
