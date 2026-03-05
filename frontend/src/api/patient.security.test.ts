import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../lib/http', () => ({
  http: {
    get: vi.fn(async () => ({ data: { ok: true } })),
    patch: vi.fn(async () => ({ data: { ok: true } })),
    delete: vi.fn(async () => ({ data: { ok: true } })),
    put: vi.fn(async () => ({ data: { ok: true } })),
    post: vi.fn(async () => ({ data: { ok: true } })),
  },
}));

import { patientApi } from './patient';
import { http } from '../lib/http';

describe('patientApi security calls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls password change endpoint', async () => {
    await patientApi.changePassword({
      currentPassword: 'Old@1234',
      newPassword: 'New@1234',
      confirmPassword: 'New@1234',
    });

    expect(http.patch).toHaveBeenCalledWith('/v1/users/me/password', {
      currentPassword: 'Old@1234',
      newPassword: 'New@1234',
      confirmPassword: 'New@1234',
    });
  });

  it('calls active sessions and revoke endpoints', async () => {
    await patientApi.getActiveSessions();
    await patientApi.revokeSession('session-uuid');
    await patientApi.revokeAllSessions();

    expect(http.get).toHaveBeenCalledWith('/v1/users/me/sessions');
    expect(http.delete).toHaveBeenCalledWith('/v1/users/me/sessions/session-uuid');
    expect(http.delete).toHaveBeenCalledWith('/v1/users/me/sessions');
  });
});
