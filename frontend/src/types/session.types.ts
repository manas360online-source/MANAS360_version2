export type TherapistSession = {
	id: string;
	title?: string; // session title
	patientName: string;
	patientId?: string;
	dateTime: string; // ISO string
	status: 'past' | 'ongoing' | 'upcoming' | string;
};

export type Paged<T> = {
	items: T[];
	meta?: {
		page: number;
		limit: number;
		total: number;
	};
};
