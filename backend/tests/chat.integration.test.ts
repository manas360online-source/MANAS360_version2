import { AppError } from '../src/middleware/error.middleware';

const mockDb = {
	user: { findUnique: jest.fn() },
	aIConversation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
	chatMessage: { findMany: jest.fn(), createMany: jest.fn(), count: jest.fn() },
	patientSubscription: { findUnique: jest.fn() },
};

const mockGenerateAIResponse = jest.fn();
const mockTriggerCrisisEscalation = jest.fn();

jest.mock('../src/config/db', () => ({
	prisma: mockDb,
}));

jest.mock('../src/services/aiService', () => ({
	generateAIResponse: (...args: unknown[]) => mockGenerateAIResponse(...args),
}));

jest.mock('../src/services/crisisEscalation.service', () => ({
	detectCrisisSignal: (message: string) => {
		const normalized = String(message || '').toLowerCase();
		return ['kill myself', 'end my life', 'suicide', 'self harm', 'want to die', 'hurt myself', 'marna chahta', 'zindagi khatam', 'jeena nahi', 'aatmahatya'].some((k) => normalized.includes(k));
	},
	getCrisisSupportResponse: () =>
		"I'm really glad you reached out. You deserve immediate support right now. Please contact your local emergency services or a suicide prevention helpline immediately. If you're in India, call Tele-MANAS at 14416 or 1-800-891-4416. If you can, reach out to a trusted person near you right now.",
	triggerCrisisEscalation: (...args: unknown[]) => mockTriggerCrisisEscalation(...args),
}));

import { processChatMessage } from '../src/services/chat.service';
import { chatRateLimiter } from '../src/middleware/chatRateLimiter';

describe('chat system scenarios', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDb.user.findUnique.mockResolvedValue({ id: 'u1', role: 'PATIENT', isDeleted: false });
		mockDb.aIConversation.findFirst.mockResolvedValue(null);
		mockDb.aIConversation.create.mockResolvedValue({ id: 'conv-1' });
		mockDb.aIConversation.update.mockResolvedValue({ id: 'conv-1' });
		mockDb.chatMessage.findMany.mockResolvedValue([]);
		mockDb.chatMessage.createMany.mockResolvedValue({ count: 2 });
		mockDb.chatMessage.count.mockResolvedValue(0);
		mockDb.patientSubscription.findUnique.mockResolvedValue({ planName: 'Basic Plan' });
		mockDb.aIConversation.count.mockResolvedValue(0);
		mockGenerateAIResponse.mockResolvedValue({
			text: 'I hear you. Let us take one steady step together.',
			tokensUsed: 42,
			latencyMs: 800,
			model: 'claude-3-haiku',
			fallback: false,
		});
	});

	it('1) patient emotional conversation returns supportive response', async () => {
		const result = await processChatMessage({ userId: 'u1', message: 'I feel overwhelmed and anxious', botType: 'mood_ai' });

		expect(result.bot_type).toBe('mood_ai');
		expect(result.bot_name).toBe('dr meera');
		expect(result.response).toContain('steady step');
		expect(result.crisis_detected).toBe(false);
		expect(mockGenerateAIResponse).toHaveBeenCalledTimes(1);
	});

	it('2) therapist clinical query returns structured clinical assistant response', async () => {
		mockDb.user.findUnique.mockResolvedValue({ id: 't1', role: 'THERAPIST', isDeleted: false });
		mockGenerateAIResponse.mockResolvedValue({
			text: '1) Review trends\n2) Check adherence\n3) Plan follow-up',
			tokensUsed: 55,
			latencyMs: 700,
			model: 'claude-3-haiku',
			fallback: false,
		});

		const result = await processChatMessage({ userId: 't1', message: 'Summarize patient progress for this week', botType: 'clinical_ai' });

		expect(result.bot_type).toBe('clinical_ai');
		expect(result.response).toContain('1)');
		expect(result.crisis_detected).toBe(false);
	});

	it('3) crisis keyword detection triggers escalation and crisis response', async () => {
		const result = await processChatMessage({ userId: 'u1', message: 'I want to die', botType: 'mood_ai' });

		expect(result.crisis_detected).toBe(true);
		expect(result.response.toLowerCase()).toContain('tele-manas');
		expect(mockTriggerCrisisEscalation).toHaveBeenCalledTimes(1);
		expect(mockGenerateAIResponse).not.toHaveBeenCalled();
	});

	it('4) free user exceeding 3 daily chats is blocked', async () => {
		mockDb.patientSubscription.findUnique.mockResolvedValue({ planName: 'Basic Plan' });
		mockDb.chatMessage.count.mockResolvedValue(3);

		const req: any = { auth: { userId: 'u1', role: 'patient' } };
		const next = jest.fn();

		await chatRateLimiter(req, {} as any, next);

		expect(next).toHaveBeenCalledTimes(1);
		const err = next.mock.calls[0][0] as AppError;
		expect(err).toBeInstanceOf(AppError);
		expect(err.statusCode).toBe(429);
	});

	it('5) premium user has unlimited chat access', async () => {
		mockDb.patientSubscription.findUnique.mockResolvedValue({ planName: 'Premium Plan' });

		const req: any = { auth: { userId: 'u1', role: 'patient' } };
		const next = jest.fn();

		await chatRateLimiter(req, {} as any, next);

		expect(next).toHaveBeenCalledWith();
		expect(mockDb.chatMessage.count).not.toHaveBeenCalled();
	});

	it('6) Claude API failure returns fallback response', async () => {
		mockGenerateAIResponse.mockResolvedValue({
			text: "I'm here to help, but I'm having trouble responding right now. Please try again shortly.",
			tokensUsed: 0,
			latencyMs: 1200,
			model: 'claude-3-haiku',
			fallback: true,
			error: 'Claude API unavailable',
		});

		const result = await processChatMessage({ userId: 'u1', message: 'Can you help me right now?', botType: 'mood_ai' });

		expect(result.response).toBe("I'm here to help, but I'm having trouble responding right now. Please try again shortly.");
		expect(result.usage.fallback).toBe(true);
	});
});
