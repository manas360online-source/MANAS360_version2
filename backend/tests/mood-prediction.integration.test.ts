const mockDb = {
	moodLog: { findMany: jest.fn(), count: jest.fn() },
	patientMoodEntry: { findMany: jest.fn() },
	moodPrediction: { upsert: jest.fn(), findMany: jest.fn(), update: jest.fn() },
};

jest.mock('../src/config/db', () => ({ prisma: mockDb }));
jest.mock('../src/services/compositeRisk', () => ({
	recomputeCompositeRisk: jest.fn().mockResolvedValue({ riskScoreId: 'risk-1' }),
}));

import { generateMoodPredictionForUser } from '../src/services/moodPrediction';

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describe('Story 5.3 Mood Prediction Model', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDb.moodPrediction.upsert.mockResolvedValue({});
		mockDb.moodPrediction.findMany.mockResolvedValue([]);
		mockDb.moodPrediction.update.mockResolvedValue({});
		mockDb.patientMoodEntry.findMany.mockResolvedValue([]);
	});

	it('stable mood data -> stable prediction', async () => {
		mockDb.moodLog.findMany.mockResolvedValue([
			{ moodValue: 6, loggedAt: daysAgo(7), note: null },
			{ moodValue: 6, loggedAt: daysAgo(6), note: null },
			{ moodValue: 6, loggedAt: daysAgo(5), note: null },
			{ moodValue: 6, loggedAt: daysAgo(4), note: null },
			{ moodValue: 6, loggedAt: daysAgo(3), note: null },
			{ moodValue: 6, loggedAt: daysAgo(2), note: null },
			{ moodValue: 6, loggedAt: daysAgo(1), note: null },
		]);
		delete process.env.CLAUDE_API_KEY;

		const result = await generateMoodPredictionForUser('patient-1');
		expect(result.trendDirection).toBe('STABLE');
		expect(result.predictions).toHaveLength(7);
	});

	it('improving trend -> increasing prediction', async () => {
		mockDb.moodLog.findMany.mockResolvedValue([
			{ moodValue: 3.8, loggedAt: daysAgo(7), note: null },
			{ moodValue: 4.1, loggedAt: daysAgo(6), note: null },
			{ moodValue: 4.5, loggedAt: daysAgo(5), note: null },
			{ moodValue: 4.9, loggedAt: daysAgo(4), note: null },
			{ moodValue: 5.2, loggedAt: daysAgo(3), note: null },
			{ moodValue: 5.6, loggedAt: daysAgo(2), note: null },
			{ moodValue: 5.9, loggedAt: daysAgo(1), note: null },
		]);
		delete process.env.CLAUDE_API_KEY;

		const result = await generateMoodPredictionForUser('patient-1');
		expect(result.trendDirection).toBe('IMPROVING');
		expect(result.predictions[6].predictedMood).toBeGreaterThan(result.predictions[0].predictedMood);
	});

	it('declining trend -> deterioration alert', async () => {
		mockDb.moodLog.findMany.mockResolvedValue([
			{ moodValue: 6.5, loggedAt: daysAgo(7), note: null },
			{ moodValue: 6.0, loggedAt: daysAgo(6), note: null },
			{ moodValue: 5.4, loggedAt: daysAgo(5), note: null },
			{ moodValue: 4.8, loggedAt: daysAgo(4), note: null },
			{ moodValue: 4.1, loggedAt: daysAgo(3), note: null },
			{ moodValue: 3.5, loggedAt: daysAgo(2), note: null },
			{ moodValue: 3.0, loggedAt: daysAgo(1), note: null },
		]);
		delete process.env.CLAUDE_API_KEY;

		const result = await generateMoodPredictionForUser('patient-1');
		expect(result.trendDirection).toBe('DETERIORATING');
		expect(result.deteriorationAlert).toBe(true);
	});

	it('insufficient mood data -> graceful response', async () => {
		mockDb.moodLog.findMany.mockResolvedValue([
			{ moodValue: 5, loggedAt: daysAgo(3), note: null },
			{ moodValue: 5, loggedAt: daysAgo(2), note: null },
			{ moodValue: 5, loggedAt: daysAgo(1), note: null },
		]);
		delete process.env.CLAUDE_API_KEY;

		const result = await generateMoodPredictionForUser('patient-1');
		expect(result.insufficientData).toBe(true);
		expect(result.predictions).toHaveLength(0);
	});

	it('Claude API failure -> fallback factor analysis', async () => {
		mockDb.moodLog.findMany.mockResolvedValue([
			{ moodValue: 5, loggedAt: daysAgo(7), note: 'poor sleep' },
			{ moodValue: 4.8, loggedAt: daysAgo(6), note: 'anxious' },
			{ moodValue: 4.9, loggedAt: daysAgo(5), note: 'walk helped' },
			{ moodValue: 4.7, loggedAt: daysAgo(4), note: null },
			{ moodValue: 4.6, loggedAt: daysAgo(3), note: null },
			{ moodValue: 4.5, loggedAt: daysAgo(2), note: null },
			{ moodValue: 4.4, loggedAt: daysAgo(1), note: null },
		]);
		process.env.CLAUDE_API_KEY = 'dummy';
		const originalFetch = global.fetch;
		(global as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));

		const result = await generateMoodPredictionForUser('patient-1');

		(global as any).fetch = originalFetch;
		delete process.env.CLAUDE_API_KEY;
		expect(result.influencingFactors.fallback_used).toBe(true);
		expect(result.influencingFactors.top_positive_factors).toEqual([]);
	});
});
