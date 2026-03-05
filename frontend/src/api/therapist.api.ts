import { http } from '../lib/http';

type Envelope<T> = { success?: boolean; message?: string; data?: T } & T;

const unwrap = <T>(response: Envelope<T>): T => {
	if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
		return response.data as T;
	}
	return response as unknown as T;
};

export type TherapistDashboardResponse = {
	therapist: { id: string; name: string; email: string | null };
	stats: {
		todaysSessions: number;
		completedToday: number;
		weeklyEarnings: number;
		activePatients: number;
		avgRating: number | null;
		pendingNotes: number;
		unreadMessages: number;
	};
	todaySessions: Array<{
		id: string;
		bookingReferenceId: string;
		time: string;
		patientName: string;
		patientInitials: string;
		sessionType: string;
		durationMinutes: number;
		status: string;
		noteSubmitted: boolean;
	}>;
	earningsChart: {
		labels: string[];
		therapistShare: number[];
		platformShare: number[];
	};
	alerts: Array<{ id: string; level: string; message: string; tone: 'danger' | 'warning' | 'success'; action: string }>;
	recentMessages: Array<{ id: string; title: string; text: string; createdAt: string; isRead: boolean }>;
	utilization: { percent: number; booked: number; total: number; open: number };
};

export type TherapistPatientItem = {
	id: string;
	name: string;
	email: string | null;
	concern: string;
	sessions: number;
	status: string;
	lastSessionAt: string | null;
};

export type TherapistSessionNoteItem = {
	id: string;
	sessionId: string;
	bookingReferenceId: string;
	patientName: string;
	sessionAt: string;
	status: 'pending' | 'submitted';
	noteUpdatedAt: string | null;
};

export type TherapistMessageItem = {
	id: string;
	title: string;
	text: string;
	type: string;
	createdAt: string;
	isRead: boolean;
};

export type TherapistPayoutItem = {
	id: string;
	date: string;
	amountMinor: number;
	status: string;
};

export type TherapistEarningsResponse = {
	summary: {
		fromDate: string;
		toDate: string;
		sessionsCompleted: number;
		grossMinor: number;
		therapistShareMinor: number;
		platformShareMinor: number;
	};
	chart: {
		labels: string[];
		therapistShare: number[];
		platformShare: number[];
	};
	items: Array<{ id: string; bookingReferenceId: string; dateTime: string; amountMinor: number; status: string }>;
};

export type TherapistAnalyticsSummary = {
	completion: number;
	total: number;
	completionRate: number;
	avgMinutes: number;
	sessions: number;
};

export type MoodPredictionResponse = {
	predictions: Array<{ date: string; predictedMood: number; weekday?: string }>;
	confidencePct: number;
	trendDirection: 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'VOLATILE' | string;
	deteriorationAlert: boolean;
	influencingFactors?: {
		top_positive_factors?: string[];
		top_negative_factors?: string[];
		sleep_mood_correlation?: string;
		activity_impact?: Record<string, string>;
		weekly_pattern?: string;
		clinical_note?: string;
		fallback_used?: boolean;
	} | null;
	insufficientData?: boolean;
	message?: string;
};

export type MoodAccuracyResponse = {
	mae: number;
	within2Pct: number;
	targetWithin2Pct: number;
	targetMet: boolean;
	totalEvaluated: number;
	recent: any[];
};

export type MoodHistoryResponse = {
	mood_logs: Array<{ moodValue?: number; loggedAt?: string; createdAt?: string }>;
	legacy_mood_entries: Array<{ moodScore?: number; date?: string; createdAt?: string }>;
};

export const therapistApi = {
	getDashboard: async (): Promise<TherapistDashboardResponse> => {
		const res = await http.get('/v1/therapists/me/dashboard');
		return unwrap<TherapistDashboardResponse>(res.data);
	},
	getPatients: async (params?: { status?: string; search?: string }): Promise<{ items: TherapistPatientItem[] }> => {
		const res = await http.get('/v1/therapists/me/patients', { params });
		return unwrap<{ items: TherapistPatientItem[] }>(res.data);
	},
	getSessions: async (params?: { page?: number; limit?: number; status?: string; patient?: string }): Promise<any> => {
		const res = await http.get('/v1/therapists/me/sessions', { params });
		return unwrap<any>(res.data);
	},
	getSessionNotes: async (): Promise<{ items: TherapistSessionNoteItem[] }> => {
		const res = await http.get('/v1/therapists/me/notes');
		return unwrap<{ items: TherapistSessionNoteItem[] }>(res.data);
	},
	getEarnings: async (): Promise<TherapistEarningsResponse> => {
		const res = await http.get('/v1/therapists/me/earnings');
		return unwrap<TherapistEarningsResponse>(res.data);
	},
	getMessages: async (): Promise<{ items: TherapistMessageItem[]; unreadCount: number }> => {
		const res = await http.get('/v1/therapists/me/messages');
		return unwrap<{ items: TherapistMessageItem[]; unreadCount: number }>(res.data);
	},
	getPayoutHistory: async (): Promise<{ items: TherapistPayoutItem[] }> => {
		const res = await http.get('/v1/therapists/me/payout-history');
		return unwrap<{ items: TherapistPayoutItem[] }>(res.data);
	},
	getAnalyticsSummary: async (): Promise<TherapistAnalyticsSummary> => {
		const res = await http.get('/v1/therapists/me/analytics/summary');
		return unwrap<TherapistAnalyticsSummary>(res.data);
	},
	getPatientMoodPrediction: async (userId: string): Promise<MoodPredictionResponse> => {
		const res = await http.get(`/v1/mood/${encodeURIComponent(userId)}/prediction`);
		return unwrap<MoodPredictionResponse>(res.data);
	},
	getPatientMoodHistory: async (userId: string): Promise<MoodHistoryResponse> => {
		const res = await http.get(`/v1/mood/${encodeURIComponent(userId)}/history`);
		return unwrap<MoodHistoryResponse>(res.data);
	},
	getPatientMoodAccuracy: async (userId: string): Promise<MoodAccuracyResponse> => {
		const res = await http.get(`/v1/mood/${encodeURIComponent(userId)}/accuracy`);
		return unwrap<MoodAccuracyResponse>(res.data);
	},
};
