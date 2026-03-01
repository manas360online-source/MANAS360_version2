import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';

const db = prisma as any;

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
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { id: true, role: true, firstName: true, lastName: true },
	});

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (String(user.role) !== 'THERAPIST') {
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
	await assertTherapistUser(userId);
	void input;
	throw new AppError('Therapist profile creation is unavailable until therapist profile Prisma models are introduced', 501);
};

export const getMyTherapistProfile = async (userId: string) => {
	await assertTherapistUser(userId);
	throw new AppError('Therapist profile retrieval is unavailable until therapist profile Prisma models are introduced', 501);
};

export const uploadMyTherapistDocument = async (
	userId: string,
	payload: { type: 'license' | 'degree' | 'certificate' },
	file: { buffer: Buffer; mimetype: string; size: number },
) => {
	await assertTherapistUser(userId);
	void payload;
	void file;
	throw new AppError('Therapist document upload is unavailable until therapist document Prisma models are introduced', 501);
};
