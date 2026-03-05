/// <reference types="jest" />

const mockDb = {
	moodLog: { findMany: jest.fn() },
	patientMoodEntry: { findMany: jest.fn() },
	moodPrediction: { upsert: jest.fn(), findMany: jest.fn(), update: jest.fn() },
	user: { findMany: jest.fn(), findFirst: jest.fn() },
	therapySession: { findFirst: jest.fn(), findMany: jest.fn() },
	notification: { create: jest.fn() },
	crisisEscalation: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};

jest.mock('../src/config/db', () => ({ prisma: mockDb }));
jest.mock('../src/services/compositeRisk', () => {
	const actual = jest.requireActual('../src/services/compositeRisk');
	return {
		...actual,
		recomputeCompositeRisk: jest.fn().mockResolvedValue(null),
	};
});

import { scorePHQ9 } from '../src/services/riskScoring';
import { computeCompositeRisk } from '../src/services/compositeRisk';
import { analyzeChatCrisis } from '../src/services/chatCrisisDetector';
import { generateMoodPredictionForUser } from '../src/services/moodPrediction';
import { triggerCrisisEscalationWorkflow } from '../src/services/crisisEscalation';

describe('story 5.2 safety-critical scenarios', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDb.moodPrediction.upsert.mockResolvedValue({});
		mockDb.moodPrediction.findMany.mockResolvedValue([]);
		mockDb.moodPrediction.update.mockResolvedValue({});
		mockDb.user.findMany.mockResolvedValue([{ id: 'therapist-1', role: 'THERAPIST' }]);
		mockDb.therapySession.findMany.mockResolvedValue([{ therapistProfileId: 'therapist-1' }]);
		mockDb.therapySession.findFirst.mockResolvedValue({ therapistProfileId: 'therapist-1' });
		mockDb.user.findFirst.mockResolvedValue({ id: 'therapist-backup-1' });
		mockDb.notification.create.mockResolvedValue({});
		mockDb.crisisEscalation.create.mockResolvedValue({ id: 'esc-1' });
		mockDb.crisisEscalation.findUnique.mockResolvedValue({ id: 'esc-1', therapistAckAt: null, status: 'OPEN' });
		mockDb.crisisEscalation.update.mockResolvedValue({});
	});

	it('PHQ-9 Q9 > 0 triggers minimum HIGH risk', () => {
		const phq = scorePHQ9([0, 0, 0, 0, 0, 0, 0, 0, 1]);
		const risk = computeCompositeRisk({
			phq9: phq.riskWeight,
			gad7: 0.05,
			chat: 0.05,
			behavioral: 0.05,
			q9Score: phq.q9Score,
		});
		expect(phq.q9CrisisFlag).toBe(true);
		expect(['HIGH', 'CRITICAL']).toContain(risk.riskLevel);
	});

	it('chat message "I want to die" returns CRITICAL in fallback analyzer', async () => {
		const previous = process.env.CLAUDE_API_KEY;
		delete process.env.CLAUDE_API_KEY;
		const analysis = await analyzeChatCrisis('I want to die');
		process.env.CLAUDE_API_KEY = previous;

		expect(analysis.crisis_intent).toBe(true);
		expect(analysis.urgency_level).toBe('CRITICAL');
	});

	it('declining mood trend produces deterioration alert', async () => {
		const now = Date.now();
		mockDb.moodLog.findMany.mockResolvedValue([
			{ moodValue: 5, loggedAt: new Date(now - 7 * 24 * 60 * 60 * 1000) },
			{ moodValue: 5, loggedAt: new Date(now - 6 * 24 * 60 * 60 * 1000) },
			{ moodValue: 4, loggedAt: new Date(now - 5 * 24 * 60 * 60 * 1000) },
			{ moodValue: 3, loggedAt: new Date(now - 4 * 24 * 60 * 60 * 1000) },
			{ moodValue: 3, loggedAt: new Date(now - 3 * 24 * 60 * 60 * 1000) },
			{ moodValue: 2, loggedAt: new Date(now - 2 * 24 * 60 * 60 * 1000) },
			{ moodValue: 2, loggedAt: new Date(now - 1 * 24 * 60 * 60 * 1000) },
		]);
		mockDb.patientMoodEntry.findMany.mockResolvedValue([]);

		const previous = process.env.CLAUDE_API_KEY;
		delete process.env.CLAUDE_API_KEY;
		const result = await generateMoodPredictionForUser('patient-1');
		process.env.CLAUDE_API_KEY = previous;

		expect(result.trendDirection).toBe('DETERIORATING');
		expect(result.deteriorationAlert).toBe(true);
	});

	it('therapist no acknowledgement triggers backup escalation after 10 minutes', async () => {
		jest.useFakeTimers();
		await triggerCrisisEscalationWorkflow({ userId: 'patient-1', riskLevel: 'CRITICAL', reason: 'test' });
		await jest.advanceTimersByTimeAsync(10 * 60 * 1000 + 50);
		expect(mockDb.crisisEscalation.update).toHaveBeenCalled();
		jest.useRealTimers();
	});

	it('Claude API failure falls back to keyword/elevated detection', async () => {
		const previousKey = process.env.CLAUDE_API_KEY;
		process.env.CLAUDE_API_KEY = 'dummy';
		const originalFetch = global.fetch;
		(global as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
		const analysis = await analyzeChatCrisis('I feel very hopeless today');
		(global as any).fetch = originalFetch;
		process.env.CLAUDE_API_KEY = previousKey;

		expect(analysis.fallback_used).toBe(true);
		expect(['MEDIUM', 'HIGH', 'CRITICAL']).toContain(analysis.urgency_level);
	});
});
