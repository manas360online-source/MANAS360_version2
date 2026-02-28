import * as express from 'express';

declare global {
	namespace Express {
		interface Request {
			user?: { id: string; role?: string } | null;
			auth?: { userId?: string; sessionId?: string; jti?: string; role?: string } | null;
		}
	}
}

export {};
export {};

import type { ProfileUpdatePayload } from '../utils/constants';
import type { ChangePasswordPayload } from '../utils/constants';

interface PatientProfilePayload {
	age: number;
	gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
	medicalHistory?: string;
	emergencyContact: {
		name: string;
		relation: string;
		phone: string;
	};
}

interface PatientAssessmentPayload {
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

interface BookSessionPayload {
	therapistId: string;
	dateTime: Date;
}

interface PatientSessionHistoryQuery {
	status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
	page: number;
	limit: number;
}

interface TherapistProfilePayload {
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

interface TherapistDocumentPayload {
	type: 'license' | 'degree' | 'certificate';
}

interface TherapistLeadsQuery {
	status?: 'available' | 'purchased';
	page: number;
	limit: number;
}

interface TherapistSessionHistoryQuery {
	status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
	patient?: string;
	from?: string;
	to?: string;
	type?: string;
	completion?: 'complete' | 'incomplete';
	page: number;
	limit: number;
}

interface TherapistSessionStatusPayload {
	status: 'confirmed' | 'cancelled' | 'completed';
}

interface TherapistSessionNotePayload {
	content: string;
}

interface TherapistEarningsQuery {
	fromDate?: Date;
	toDate?: Date;
	page: number;
	limit: number;
}

interface AdminListUsersQuery {
	role?: string;
	status?: string;
	page: number;
	limit: number;
}

interface AdminListSubscriptionsQuery {
	planType?: string;
	status?: string;
	page: number;
	limit: number;
}

declare global {
	namespace Express {
		interface Request {
			auth?: {
				userId: string;
				sessionId: string;
				jti: string;
				role?: 'patient' | 'therapist' | 'admin' | 'superadmin';
			};
			validatedUserUpdate?: ProfileUpdatePayload;
			validatedChangePassword?: ChangePasswordPayload;
			validatedPatientProfile?: PatientProfilePayload;
			validatedPatientAssessment?: PatientAssessmentPayload;
			validatedPatientAssessmentHistoryQuery?: PatientAssessmentHistoryQuery;
			validatedPatientMoodHistoryQuery?: PatientMoodHistoryQuery;
			validatedTherapistMatchQuery?: TherapistMatchQuery;
			validatedBookSessionPayload?: BookSessionPayload;
			validatedPatientSessionHistoryQuery?: PatientSessionHistoryQuery;
			validatedTherapistProfilePayload?: TherapistProfilePayload;
			validatedTherapistDocumentPayload?: TherapistDocumentPayload;
			validatedTherapistLeadsQuery?: TherapistLeadsQuery;
			validatedTherapistSessionHistoryQuery?: TherapistSessionHistoryQuery;
			validatedTherapistSessionStatusPayload?: TherapistSessionStatusPayload;
			validatedTherapistSessionNotePayload?: TherapistSessionNotePayload;
			validatedTherapistEarningsQuery?: TherapistEarningsQuery;
			validatedAdminListUsersQuery?: AdminListUsersQuery;
			validatedAdminListSubscriptionsQuery?: AdminListSubscriptionsQuery;
			validatedUserId?: string;
			validatedTherapistProfileId?: string;
		}
	}
}

