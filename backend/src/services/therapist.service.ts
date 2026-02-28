import TherapistProfileModel from '../models/therapist.model';
import UserModel from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import TherapistDocumentModel from '../models/therapist-document.model';
import {
	getSignedTherapistDocumentUrl,
	uploadTherapistDocumentToS3,
} from './s3.service';

interface TherapistProfileInput {
	bio: string;
	specializations: string[];
	languages: string[];
	yearsOfExperience: number;
	consultationFee: number;
	availabilitySlots: Array<{
		dayOfWeek: number;
		startMinute: number;
		endMinute: number;
		isAvailable: boolean;
	}>;
}

const normalizeArray = (values: string[]): string[] => {
	const normalized = values
		.map((value) => value.trim())
		.filter((value) => value.length > 0);

	return Array.from(new Set(normalized));
};

const minuteToTime = (minute: number): string => {
	const hours = Math.floor(minute / 60)
		.toString()
		.padStart(2, '0');
	const mins = (minute % 60).toString().padStart(2, '0');

	return `${hours}:${mins}`;
};

const assertTherapistUser = async (userId: string) => {
	const user = await UserModel.findById(userId).select('_id role isDeleted name').lean();

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (user.isDeleted) {
		throw new AppError('User account is deleted', 410);
	}

	if (user.role !== 'therapist') {
		throw new AppError('Therapist role required', 403);
	}

	return user;
};

const toSafeProfile = (profile: {
	_id: { toString: () => string };
	displayName: string;
	bio?: string | null;
	specializations: string[];
	languages: string[];
	yearsOfExperience: number;
	consultationFee: number;
	availabilitySlots: Array<{
		dayOfWeek: number;
		startMinute: number;
		endMinute: number;
		isAvailable: boolean;
	}>;
	averageRating: number;
	createdAt: Date;
	updatedAt: Date;
}) => ({
	id: profile._id.toString(),
	displayName: profile.displayName,
	bio: profile.bio ?? null,
	specializations: profile.specializations,
	languages: profile.languages,
	yearsOfExperience: profile.yearsOfExperience,
	consultationFee: profile.consultationFee,
	availabilitySlots: profile.availabilitySlots.map((slot) => ({
		dayOfWeek: slot.dayOfWeek,
		startTime: minuteToTime(slot.startMinute),
		endTime: minuteToTime(slot.endMinute),
		isAvailable: slot.isAvailable,
	})),
	averageRating: profile.averageRating,
	createdAt: profile.createdAt,
	updatedAt: profile.updatedAt,
});

export const createTherapistProfile = async (userId: string, input: TherapistProfileInput) => {
	const user = await assertTherapistUser(userId);

	const existingProfile = await TherapistProfileModel.findOne({ userId }).select({ _id: 1 }).lean();
	if (existingProfile) {
		throw new AppError('Therapist profile already exists', 409);
	}

	const created = await TherapistProfileModel.create({
		userId,
		displayName: user.name?.trim() || 'Therapist',
		bio: input.bio.trim(),
		specializations: normalizeArray(input.specializations),
		languages: normalizeArray(input.languages),
		yearsOfExperience: input.yearsOfExperience,
		consultationFee: input.consultationFee,
		availabilitySlots: input.availabilitySlots,
	});

	const profile = await TherapistProfileModel.findById(created._id)
		.select({
			displayName: 1,
			bio: 1,
			specializations: 1,
			languages: 1,
			yearsOfExperience: 1,
			consultationFee: 1,
			availabilitySlots: 1,
			averageRating: 1,
			createdAt: 1,
			updatedAt: 1,
		})
		.lean();

	if (!profile) {
		throw new AppError('Therapist profile not found', 404);
	}

	return toSafeProfile(profile);
};

export const getMyTherapistProfile = async (userId: string) => {
	await assertTherapistUser(userId);

	const profile = await TherapistProfileModel.findOne({ userId })
		.select({
			displayName: 1,
			bio: 1,
			specializations: 1,
			languages: 1,
			yearsOfExperience: 1,
			consultationFee: 1,
			availabilitySlots: 1,
			averageRating: 1,
			createdAt: 1,
			updatedAt: 1,
		})
		.lean();

	if (!profile) {
		throw new AppError('Therapist profile not found', 404);
	}

	return toSafeProfile(profile);
};

export const uploadMyTherapistDocument = async (
	userId: string,
	payload: { type: 'license' | 'degree' | 'certificate' },
	file: { buffer: Buffer; mimetype: string; size: number },
) => {
	await assertTherapistUser(userId);

	const therapistProfile = await TherapistProfileModel.findOne({ userId }).select({ _id: 1 }).lean();
	if (!therapistProfile) {
		throw new AppError('Therapist profile not found. Please create profile first.', 404);
	}

	const uploadResult = await uploadTherapistDocumentToS3({
		therapistUserId: userId,
		documentType: payload.type,
		buffer: file.buffer,
		mimeType: file.mimetype,
	});

	const document = await TherapistDocumentModel.create({
		therapistId: therapistProfile._id,
		fileUrl: uploadResult.objectUrl,
		objectKey: uploadResult.objectKey,
		type: payload.type,
		mimeType: file.mimetype,
		sizeBytes: file.size,
		uploadedAt: new Date(),
	});

	const signedUrl = await getSignedTherapistDocumentUrl(uploadResult.objectKey);

	return {
		documentId: String(document._id),
		type: document.type,
		fileUrl: document.fileUrl,
		signedUrl,
		uploadedAt: document.uploadedAt,
	};
};
