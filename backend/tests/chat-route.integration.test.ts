import express from 'express';
import request from 'supertest';

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

jest.mock('../src/middleware/auth.middleware', () => ({
	requireAuth: (req: any, _res: any, next: any) => {
		const userId = String(req.headers['x-user-id'] || '').trim();
		if (!userId) {
			const { AppError } = require('../src/middleware/error.middleware');
			next(new AppError('Authentication required', 401));
			return;
		}
		req.auth = {
			userId,
			sessionId: 's1',
			jti: 'j1',
			role: String(req.headers['x-user-role'] || 'patient').toLowerCase(),
		};
		next();
	},
}));

jest.mock('../src/middleware/rbac.middleware', () => ({
	requireRole:
		() =>
		(_req: any, _res: any, next: any) => {
			next();
		},
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

import chatRoutes from '../src/routes/chat.routes';
import { errorHandler } from '../src/middleware/error.middleware';

const buildApp = () => {
	const app = express();
	app.use(express.json());
	app.use('/chat', chatRoutes);
	app.use(errorHandler);
	return app;
};

describe('POST /chat/message route', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDb.user.findUnique.mockResolvedValue({ id: 'p1', role: 'PATIENT', isDeleted: false });
		mockDb.aIConversation.findFirst.mockResolvedValue(null);
		mockDb.aIConversation.create.mockResolvedValue({ id: 'conv-1' });
		mockDb.aIConversation.update.mockResolvedValue({ id: 'conv-1' });
		mockDb.chatMessage.findMany.mockResolvedValue([]);
		mockDb.chatMessage.createMany.mockResolvedValue({ count: 2 });
		mockDb.chatMessage.count.mockResolvedValue(0);
		mockDb.patientSubscription.findUnique.mockResolvedValue({ planName: 'Basic Plan' });
		mockDb.aIConversation.count.mockResolvedValue(0);
		mockGenerateAIResponse.mockResolvedValue({
			text: 'I hear you and I am here with you.',
			tokensUsed: 18,
			latencyMs: 500,
			model: 'claude-3-haiku',
			fallback: false,
		});
	});

	it('returns 401 when unauthenticated', async () => {
		const app = buildApp();
		const res = await request(app).post('/chat/message').send({ message: 'Hello', bot_type: 'mood_ai' });

		expect(res.status).toBe(401);
		expect(res.body.message).toContain('Authentication required');
	});

	it('allows patient mood_ai request', async () => {
		const app = buildApp();
		const res = await request(app)
			.post('/chat/message')
			.set('x-user-id', 'p1')
			.set('x-user-role', 'patient')
			.send({ message: 'I feel stressed', bot_type: 'mood_ai' });

		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
		expect(res.body.data.bot_type).toBe('mood_ai');
		expect(res.body.data.bot_name).toBe('dr meera');
	});

	it('blocks patient from clinical_ai', async () => {
		const app = buildApp();
		const res = await request(app)
			.post('/chat/message')
			.set('x-user-id', 'p1')
			.set('x-user-role', 'patient')
			.send({ message: 'help with clinical dashboard', bot_type: 'clinical_ai' });

		expect(res.status).toBe(403);
		expect(String(res.body.message || '')).toContain('Clinical Assistant AI is available only for providers/admins');
	});

	it('allows therapist clinical_ai request', async () => {
		mockDb.user.findUnique.mockResolvedValue({ id: 't1', role: 'THERAPIST', isDeleted: false });
		const app = buildApp();

		const res = await request(app)
			.post('/chat/message')
			.set('x-user-id', 't1')
			.set('x-user-role', 'therapist')
			.send({ message: 'summarize this week trends', bot_type: 'clinical_ai' });

		expect(res.status).toBe(200);
		expect(res.body.data.bot_type).toBe('clinical_ai');
	});

	it('returns 422 for invalid bot_type', async () => {
		const app = buildApp();
		const res = await request(app)
			.post('/chat/message')
			.set('x-user-id', 'p1')
			.set('x-user-role', 'patient')
			.send({ message: 'hello', bot_type: 'unknown_bot' });

		expect(res.status).toBe(422);
		expect(String(res.body.message || '')).toContain('bot_type must be mood_ai or clinical_ai');
	});

	it('returns 403 when user_id mismatches for non-admin', async () => {
		const app = buildApp();
		const res = await request(app)
			.post('/chat/message')
			.set('x-user-id', 'p1')
			.set('x-user-role', 'patient')
			.send({ user_id: 'someone-else', message: 'hello', bot_type: 'mood_ai' });

		expect(res.status).toBe(403);
		expect(String(res.body.message || '')).toContain('user_id does not match authenticated user');
	});

	it('allows admin to send for another user_id', async () => {
		mockDb.user.findUnique.mockResolvedValue({ id: 'target-user', role: 'PATIENT', isDeleted: false });
		const app = buildApp();

		const res = await request(app)
			.post('/chat/message')
			.set('x-user-id', 'admin-1')
			.set('x-user-role', 'admin')
			.send({ user_id: 'target-user', message: 'how are you feeling?', bot_type: 'mood_ai' });

		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
	});

	it('returns 429 when free-tier daily chat limit exceeded', async () => {
		mockDb.chatMessage.count.mockResolvedValue(3);
		const app = buildApp();

		const res = await request(app)
			.post('/chat/message')
			.set('x-user-id', 'p1')
			.set('x-user-role', 'patient')
			.send({ message: 'another message', bot_type: 'mood_ai' });

		expect(res.status).toBe(429);
		expect(String(res.body.message || '')).toContain('Daily AI chat limit reached');
	});
});
