import request from 'supertest';
import app from '../src/app';
import { AppError } from '../src/middleware/error.middleware';
import {
	loginWithPassword,
	registerWithEmail,
} from '../src/services/auth.service';

jest.mock('../src/services/auth.service', () => ({
	registerWithEmail: jest.fn(),
	verifyEmailOtp: jest.fn(),
	registerWithPhone: jest.fn(),
	verifyPhoneOtp: jest.fn(),
	loginWithPassword: jest.fn(),
	loginWithGoogle: jest.fn(),
	refreshAuthTokens: jest.fn(),
	requestPasswordReset: jest.fn(),
	resetPassword: jest.fn(),
	setupMfa: jest.fn(),
	verifyAndEnableMfa: jest.fn(),
	logoutSession: jest.fn(),
	getActiveSessions: jest.fn(),
	revokeSession: jest.fn(),
}));

const mockedRegisterWithEmail = registerWithEmail as jest.MockedFunction<typeof registerWithEmail>;
const mockedLoginWithPassword = loginWithPassword as jest.MockedFunction<typeof loginWithPassword>;

describe('auth registration and login', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('registers user with valid role', async () => {
		mockedRegisterWithEmail.mockResolvedValueOnce({
			userId: 'user-1',
			email: 'test@example.com',
			message: 'Registration successful. Verify your email OTP.',
			devOtp: undefined,
		});

		const response = await request(app)
			.post('/api/auth/register')
			.send({
				email: 'test@example.com',
				password: 'Password@123',
				name: 'Test User',
				role: 'patient',
			});

		expect(response.status).toBe(201);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toMatchObject({
			userId: 'user-1',
			email: 'test@example.com',
		});
		expect(mockedRegisterWithEmail).toHaveBeenCalledTimes(1);
	});

	it('rejects invalid role at registration', async () => {
		const response = await request(app)
			.post('/api/auth/register')
			.send({
				email: 'invalid-role@example.com',
				password: 'Password@123',
				name: 'Invalid Role',
				role: 'admin',
			});

		expect(response.status).toBe(400);
		expect(response.body.message).toContain('Invalid role');
		expect(mockedRegisterWithEmail).not.toHaveBeenCalled();
	});

	it('logs in with valid credentials and sets auth cookies', async () => {
		mockedLoginWithPassword.mockResolvedValueOnce({
			user: {
				id: 'user-1',
				email: 'test@example.com',
				phone: null,
				role: 'PATIENT',
				emailVerified: true,
				phoneVerified: false,
				mfaEnabled: false,
			},
			accessToken: 'access-token',
			refreshToken: 'refresh-token',
			sessionId: 'session-1',
			refreshJti: 'refresh-jti-1',
		});

		const response = await request(app)
			.post('/api/auth/login')
			.send({
				identifier: 'test@example.com',
				password: 'Password@123',
			});

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.user.email).toBe('test@example.com');
		expect(response.body.data.user.role).toBe('PATIENT');
		expect(response.headers['set-cookie']).toEqual(
			expect.arrayContaining([
				expect.stringContaining('access_token='),
				expect.stringContaining('refresh_token='),
			]),
		);
		expect(mockedLoginWithPassword).toHaveBeenCalledTimes(1);
	});

	it('blocks login when email verification is pending', async () => {
		mockedLoginWithPassword.mockRejectedValueOnce(
			new AppError('Email verification required before login', 403),
		);

		const response = await request(app)
			.post('/api/auth/login')
			.send({
				identifier: 'pending@example.com',
				password: 'Password@123',
			});

		expect(response.status).toBe(403);
		expect(response.body.message).toBe('Email verification required before login');
	});
});
