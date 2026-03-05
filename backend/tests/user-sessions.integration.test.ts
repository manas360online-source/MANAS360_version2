import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import {
  invalidateAllMySessions,
  invalidateMySession,
  listMyActiveSessions,
} from '../src/services/user.service';

jest.mock('../src/services/user.service', () => ({
  changeMyPassword: jest.fn(),
  getMyProfile: jest.fn(),
  invalidateMySession: jest.fn(),
  invalidateAllMySessions: jest.fn(),
  listMyActiveSessions: jest.fn(),
  softDeleteMyAccount: jest.fn(),
  updateMyProfile: jest.fn(),
  uploadMyProfilePhoto: jest.fn(),
}));

const mockedListMyActiveSessions = listMyActiveSessions as jest.MockedFunction<typeof listMyActiveSessions>;
const mockedInvalidateMySession = invalidateMySession as jest.MockedFunction<typeof invalidateMySession>;
const mockedInvalidateAllMySessions = invalidateAllMySessions as jest.MockedFunction<typeof invalidateAllMySessions>;

const getAccessToken = (userId: string, sessionId = 'session-1') =>
  jwt.sign(
    {
      sub: userId,
      sessionId,
      jti: 'jti-1',
      type: 'access',
    },
    process.env.JWT_ACCESS_SECRET || 'test-access-secret',
    { expiresIn: '1h' },
  );

describe('user sessions routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches active sessions for authenticated user', async () => {
    mockedListMyActiveSessions.mockResolvedValueOnce([
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        device: 'MacBook',
        ipAddress: '127.0.0.1',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        isCurrent: true,
      },
    ] as any);

    const token = getAccessToken('user-1', 'session-1');
    const response = await request(app)
      .get('/api/v1/users/me/sessions')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(mockedListMyActiveSessions).toHaveBeenCalledWith('user-1', 'session-1');
  });

  it('revokes a specific session', async () => {
    mockedInvalidateMySession.mockResolvedValueOnce(undefined);

    const token = getAccessToken('user-1', 'session-1');
    const response = await request(app)
      .delete('/api/v1/users/me/sessions/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockedInvalidateMySession).toHaveBeenCalledWith('user-1', '3fa85f64-5717-4562-b3fc-2c963f66afa6');
  });

  it('revokes all sessions', async () => {
    mockedInvalidateAllMySessions.mockResolvedValueOnce({ revokedCount: 3 });

    const token = getAccessToken('user-1', 'session-1');
    const response = await request(app)
      .delete('/api/v1/users/me/sessions')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ revokedCount: 3 });
    expect(mockedInvalidateAllMySessions).toHaveBeenCalledWith('user-1');
  });
});
