import prisma from '../config/db';
import { AppError } from '../middleware/error.middleware';
import { buildPaginationMeta, normalizePagination } from '../utils/pagination';

interface PatientProfileInput {
	age: number;
	gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
	medicalHistory?: string;
	emergencyContact: {
		name: string;
		relation: string;
		phone: string;
	};
}

interface PatientAssessmentInput {
	type: 'PHQ-9' | 'GAD-7';
	answers: number[];
}

interface PatientAssessmentHistoryQuery {
	type?: 'PHQ-9' | 'GAD-7';
	fromDate?: Date;
	toDate?: Date;
	page: number;
	limit: number;
}

interface PatientMoodHistoryQuery {
	fromDate?: Date;
	toDate?: Date;
}

interface TherapistMatchQuery {
	languagePreference?: string;
	specializationPreference?: string;
	nextHours: number;
}

const safePatientSelect = {
	userId: true,
	age: true,
	gender: true,
	medicalHistory: true,
	emergencyContact: true,
	createdAt: true,
	updatedAt: true,
} as const;

const safeAssessmentSelect = {
	type: true,
	answers: true,
	totalScore: true,
	severityLevel: true,
	createdAt: true,
} as const;

const assertPatientUser = async (userId: string): Promise<void> => {
	const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, /* isDeleted: true if available */ } });

	if (!user) {
		throw new AppError('User not found', 404);
	}

	// If your User model tracks deletion, include that check. Placeholder kept for parity with previous behavior.
	if ((user as any).isDeleted) {
		throw new AppError('User account is deleted', 410);
	}

	// Accept both enum (PATIENT) and string forms ('patient') during transition
	if (user.role !== 'PATIENT' && user.role !== 'patient') {
		throw new AppError('Patient role required', 403);
	}
};

export const createPatientProfile = async (userId: string, input: PatientProfileInput) => {
	await assertPatientUser(userId);

	const existingProfile = await prisma.patientProfile.findUnique({ where: { userId } });
	if (existingProfile) {
		throw new AppError('Patient profile already exists', 409);
	}

	const profile = await prisma.patientProfile.create({
		data: {
			userId,
			age: input.age,
			gender: input.gender,
			medicalHistory: input.medicalHistory ?? null,
			emergencyContact: input.emergencyContact as any,
		},
	});

	return prisma.patientProfile.findUnique({ where: { id: profile.id }, select: safePatientSelect });
};

export const getMyPatientProfile = async (userId: string) => {
	await assertPatientUser(userId);

	const profile = await prisma.patientProfile.findUnique({ where: { userId }, select: safePatientSelect });

	if (!profile) {
		throw new AppError('Patient profile not found', 404);
	}

	return profile;
};

const calculateAssessmentScore = (type: 'PHQ-9' | 'GAD-7', answers: number[]) => {
	const expectedLength = type === 'PHQ-9' ? 9 : 7;

	if (answers.length !== expectedLength) {
		throw new AppError(`answers must contain exactly ${expectedLength} values for ${type}`, 422);
	}

	const totalScore = answers.reduce((sum, value) => sum + value, 0);

	if (type === 'PHQ-9') {
		if (totalScore <= 4) {
			return { totalScore, severityLevel: 'minimal' };
		}

		if (totalScore <= 9) {
			return { totalScore, severityLevel: 'mild' };
		}

		if (totalScore <= 14) {
			return { totalScore, severityLevel: 'moderate' };
		}

		if (totalScore <= 19) {
			return { totalScore, severityLevel: 'moderately_severe' };
		}

		return { totalScore, severityLevel: 'severe' };
	}

	if (totalScore <= 4) {
		return { totalScore, severityLevel: 'minimal' };
	}

	if (totalScore <= 9) {
		return { totalScore, severityLevel: 'mild' };
	}

	if (totalScore <= 14) {
		return { totalScore, severityLevel: 'moderate' };
	}

	return { totalScore, severityLevel: 'severe' };
};

export const createPatientAssessment = async (userId: string, input: PatientAssessmentInput) => {
	await assertPatientUser(userId);

	const patientProfile = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });

	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

	const { totalScore, severityLevel } = calculateAssessmentScore(input.type, input.answers);

	const assessment = await prisma.patientAssessment.create({
		data: {
			patientId: patientProfile.id,
			type: input.type,
			answers: input.answers,
			totalScore,
			severityLevel,
		},
	});

	return prisma.patientAssessment.findUnique({ where: { id: assessment.id }, select: safeAssessmentSelect });
};

export const getMyPatientAssessmentHistory = async (userId: string, query: PatientAssessmentHistoryQuery) => {
	await assertPatientUser(userId);

	const patientProfile = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });

	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

	const pagination = normalizePagination(
		{ page: query.page, limit: query.limit },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	const where: any = { patientId: patientProfile.id };
	if (query.type) where.type = query.type;
	if (query.fromDate || query.toDate) {
		where.createdAt = {
			...(query.fromDate ? { gte: query.fromDate } : {}),
			...(query.toDate ? { lte: query.toDate } : {}),
		};
	}

	const [totalItems, items] = await Promise.all([
		prisma.patientAssessment.count({ where }),
		prisma.patientAssessment.findMany({
			where,
			select: safeAssessmentSelect,
			orderBy: { createdAt: 'desc' },
			skip: pagination.skip,
			take: pagination.limit,
		}),
	]);

	return {
		items,
		meta: buildPaginationMeta(totalItems, pagination),
	};
};

const calculateMoodTrend = (
	entries: Array<{
		moodScore: number;
		date: Date;
	}>,
): { trend: 'improving' | 'stable' | 'declining'; delta: number } => {
	if (entries.length < 2) {
		return { trend: 'stable', delta: 0 };
	}

	const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
	const splitIndex = Math.floor(sorted.length / 2);

	const firstWindow = sorted.slice(0, splitIndex);
	const secondWindow = sorted.slice(splitIndex);

	if (firstWindow.length === 0 || secondWindow.length === 0) {
		return { trend: 'stable', delta: 0 };
	}

	const firstAvg = firstWindow.reduce((sum, entry) => sum + entry.moodScore, 0) / firstWindow.length;
	const secondAvg = secondWindow.reduce((sum, entry) => sum + entry.moodScore, 0) / secondWindow.length;

	const delta = Number((secondAvg - firstAvg).toFixed(2));

	if (delta >= 0.5) {
		return { trend: 'improving', delta };
	}

	if (delta <= -0.5) {
		return { trend: 'declining', delta };
	}

	return { trend: 'stable', delta };
};

export const getMyMoodHistory = async (userId: string, query: PatientMoodHistoryQuery) => {
	await assertPatientUser(userId);

	const patientProfile = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });

	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

	const where: any = { patientId: patientProfile.id };
	if (query.fromDate || query.toDate) {
		where.date = {
			...(query.fromDate ? { gte: query.fromDate } : {}),
			...(query.toDate ? { lte: query.toDate } : {}),
		};
	}

	const [items, groupedByWeek, groupedByMonth] = await Promise.all([
		prisma.patientMoodEntry.findMany({ where, select: { moodScore: true, note: true, date: true }, orderBy: { date: 'desc' } }),
		// Weekly aggregation via raw query: use PostgreSQL date_trunc and grouping per iso_week
		prisma.$queryRawUnsafe(`
			SELECT to_char(date_trunc('week', date), 'IYYY-"W"IW') as period,
				   ROUND(AVG(mood_score)::numeric, 2) as averageMoodScore,
				   COUNT(*) as entryCount
			FROM patient_mood_entries
			WHERE patient_id = $1
			${query.fromDate ? "AND date >= $2" : ''}
			${query.toDate ? (query.fromDate ? "AND date <= $3" : "AND date <= $2") : ''}
			GROUP BY period
			ORDER BY period DESC
			LIMIT 52
		`, patientProfile.id, query.fromDate ?? null, query.toDate ?? null),
		// Monthly aggregation
		prisma.$queryRawUnsafe(`
			SELECT to_char(date_trunc('month', date), 'YYYY-MM') as period,
				   ROUND(AVG(mood_score)::numeric, 2) as averageMoodScore,
				   COUNT(*) as entryCount
			FROM patient_mood_entries
			WHERE patient_id = $1
			${query.fromDate ? "AND date >= $2" : ''}
			${query.toDate ? (query.fromDate ? "AND date <= $3" : "AND date <= $2") : ''}
			GROUP BY period
			ORDER BY period DESC
			LIMIT 24
		`, patientProfile.id, query.fromDate ?? null, query.toDate ?? null),
	]);

	const trend = calculateMoodTrend(items.map((item) => ({ moodScore: item.moodScore, date: new Date(item.date) })));

	return {
		items,
		grouped: {
			week: groupedByWeek,
			month: groupedByMonth,
		},
		trend,
	};
};

const severityToSpecializationMap: Record<string, string[]> = {
	minimal: ['stress_management', 'general_wellness'],
	mild: ['anxiety', 'stress_management', 'depression'],
	moderate: ['anxiety', 'depression', 'cbt'],
	moderately_severe: ['depression', 'trauma', 'cbt'],
	severe: ['depression', 'trauma', 'crisis_intervention'],
};

const WEIGHTS = {
	severity: 0.35,
	specialization: 0.3,
	language: 0.2,
	availability: 0.15,
} as const;

const clamp = (value: number, min = 0, max = 1): number => {
	if (value < min) {
		return min;
	}

	if (value > max) {
		return max;
	}

	return value;
};

const normalizeStrings = (values: string[]): string[] =>
	values
		.map((value) => value.trim().toLowerCase())
		.filter((value) => value.length > 0);

const scoreSeverity = (therapistSpecializations: string[], targetSpecializations: string[]): number => {
	if (targetSpecializations.length === 0 || therapistSpecializations.length === 0) {
		return 0;
	}

	const therapistSet = new Set(therapistSpecializations);
	const overlap = targetSpecializations.filter((target) => therapistSet.has(target)).length;

	return clamp(overlap / targetSpecializations.length);
};

const scoreSpecialization = (
	therapistSpecializations: string[],
	patientPreference?: string,
	targetSpecializations: string[] = [],
): number => {
	if (therapistSpecializations.length === 0) {
		return 0;
	}

	if (patientPreference) {
		const preference = patientPreference.trim().toLowerCase();
		if (preference.length > 0 && therapistSpecializations.includes(preference)) {
			return 1;
		}
	}

	if (targetSpecializations.length > 0) {
		return scoreSeverity(therapistSpecializations, targetSpecializations);
	}

	return 0.5;
};

const scoreLanguage = (therapistLanguages: string[], languagePreference?: string): number => {
	if (!languagePreference) {
		return therapistLanguages.length > 0 ? 0.5 : 0;
	}

	if (therapistLanguages.length === 0) {
		return 0;
	}

	const preference = languagePreference.trim().toLowerCase();
	return therapistLanguages.includes(preference) ? 1 : 0;
};

const scoreAvailability = (
	availabilitySlots: Array<{
		dayOfWeek: number;
		startMinute: number;
		endMinute: number;
		isAvailable: boolean;
	}>,
	nextHours: number,
): number => {
	const availableSlots = availabilitySlots.filter((slot) => slot.isAvailable && slot.endMinute > slot.startMinute);

	if (availableSlots.length === 0) {
		return 0;
	}

	const now = new Date();
	const horizon = new Date(now.getTime() + nextHours * 60 * 60 * 1000);
	let matchedSlots = 0;

	for (const slot of availableSlots) {
		let inHorizon = false;

		for (let offset = 0; offset <= 14; offset += 1) {
			const candidate = new Date(now);
			candidate.setDate(now.getDate() + offset);

			if (candidate.getDay() !== slot.dayOfWeek) {
				continue;
			}

			const slotStart = new Date(candidate);
			slotStart.setHours(0, 0, 0, 0);
			slotStart.setMinutes(slot.startMinute);

			if (slotStart >= now && slotStart <= horizon) {
				inHorizon = true;
				break;
			}
		}

		if (inHorizon) {
			matchedSlots += 1;
		}
	}

	return clamp(matchedSlots / availableSlots.length);
};

const calculateCompatibilityScore = (input: {
	severityScore: number;
	specializationScore: number;
	languageScore: number;
	availabilityScore: number;
}): number => {
	const weighted =
		input.severityScore * WEIGHTS.severity +
		input.specializationScore * WEIGHTS.specialization +
		input.languageScore * WEIGHTS.language +
		input.availabilityScore * WEIGHTS.availability;

	return Number((weighted * 100).toFixed(2));
};

const inferPrimaryNeed = (severityLevel: string): string => {
	if (severityLevel === 'severe' || severityLevel === 'moderately_severe') {
		return 'high_support';
	}

	if (severityLevel === 'moderate') {
		return 'focused_support';
	}

	return 'preventive_support';
};

export const getMyTherapistMatches = async (userId: string, query: TherapistMatchQuery) => {
	await assertPatientUser(userId);

	const patientProfile = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });

	if (!patientProfile) {
		throw new AppError('Patient profile not found. Please create profile first.', 404);
	}

	const latestAssessment = await prisma.patientAssessment.findFirst({
		where: { patientId: patientProfile.id },
		select: { severityLevel: true, createdAt: true },
		orderBy: { createdAt: 'desc' },
	});

	if (!latestAssessment) {
		throw new AppError('Assessment not found. Please complete assessment first.', 404);
	}

	const targetSpecializations = normalizeStrings(severityToSpecializationMap[latestAssessment.severityLevel] ?? []);

	const therapists = await prisma.user.findMany({
		where: { role: 'THERAPIST' },
		select: {
			id: true,
			firstName: true,
			lastName: true,
		},
		take: 500,
	});

	const rankedMatches = therapists
		.map((therapist) => {
			const therapistSpecializations: string[] = [];
			const therapistLanguages: string[] = [];

			const severityScore = scoreSeverity(therapistSpecializations, targetSpecializations);
			const specializationScore = scoreSpecialization(
				therapistSpecializations,
				query.specializationPreference,
				targetSpecializations,
			);
			const languageScore = scoreLanguage(therapistLanguages, query.languagePreference);
			const availabilityScore = scoreAvailability(therapist.availabilitySlots ?? [], query.nextHours);

			const compatibilityScore = calculateCompatibilityScore({
				severityScore,
				specializationScore,
				languageScore,
				availabilityScore,
			});

			const capacityRatio = 0;

			return {
				therapist: {
					id: therapist.id,
					displayName: `${therapist.firstName} ${therapist.lastName}`.trim(),
					specializations: [],
					languages: [],
					yearsOfExperience: 0,
					averageRating: 0,
				},
				compatibilityScore,
				scoreBreakdown: {
					severity: Number((severityScore * 100).toFixed(2)),
					specialization: Number((specializationScore * 100).toFixed(2)),
					language: Number((languageScore * 100).toFixed(2)),
					availability: Number((availabilityScore * 100).toFixed(2)),
				},
				capacityRatio: Number((capacityRatio * 100).toFixed(2)),
			};
		})
		.sort((a, b) => {
			if (b.compatibilityScore !== a.compatibilityScore) {
				return b.compatibilityScore - a.compatibilityScore;
			}

			if (b.capacityRatio !== a.capacityRatio) {
				return b.capacityRatio - a.capacityRatio;
			}

			return 0;
		})
		.slice(0, 5);

	return {
		algorithm: {
			version: 'v1',
			weights: WEIGHTS,
			formula:
				'compatibility = 100 * (0.35*severity + 0.30*specialization + 0.20*language + 0.15*availability)',
		},
		context: {
			assessmentSeverity: latestAssessment.severityLevel,
			derivedPrimaryNeed: inferPrimaryNeed(latestAssessment.severityLevel),
			targetSpecializations,
			languagePreference: query.languagePreference ?? null,
			specializationPreference: query.specializationPreference ?? null,
			nextHours: query.nextHours,
		},
		matches: rankedMatches,
	};
};

