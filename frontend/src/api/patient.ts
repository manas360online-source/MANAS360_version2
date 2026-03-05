import { http } from '../lib/http';

const withV1Fallback = async <T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> => {
  try {
    return await primary();
  } catch (error: any) {
    const status = Number(error?.response?.status || 0);
    if (status === 404) {
      return fallback();
    }
    throw error;
  }
};

export const patientApi = {
  getDashboard: async () => (await http.get('/v1/patient/dashboard')).data,
  getDashboardV2: async () => (await http.get('/patient/dashboard')).data,
  changePassword: async (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    (await http.patch('/v1/users/me/password', payload)).data,
  getActiveSessions: async () => (await http.get('/v1/users/me/sessions')).data,
  revokeSession: async (id: string) => (await http.delete(`/v1/users/me/sessions/${encodeURIComponent(id)}`)).data,
  revokeAllSessions: async () => (await http.delete('/v1/users/me/sessions')).data,
  getSettings: async () => (await http.get('/patient/settings')).data,
  updateSettings: async (settings: Record<string, any>) => (await http.put('/patient/settings', { settings })).data,
  getSupportCenter: async () => (await http.get('/patient/support')).data,
  createSupportTicket: async (payload: { subject: string; message: string; category?: string; priority?: string }) =>
    (await http.post('/patient/support/tickets', payload)).data,
  listProviders: async (params?: { specialization?: string; language?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }) =>
    (await http.get('/v1/providers', { params })).data,
  getProvider: async (id: string) => (await http.get(`/v1/providers/${encodeURIComponent(id)}`)).data,
  bookSession: async (payload: { providerId: string; scheduledAt: string; durationMinutes?: number; amountMinor?: number }) =>
    (await http.post('/v1/sessions/book', payload)).data,
  verifyPayment: async (payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    (await http.post('/v1/payments/verify', payload)).data,
  getUpcomingSessions: async () => (await http.get('/v1/sessions/upcoming')).data,
  getSessionHistory: async () => (await http.get('/v1/sessions/history')).data,
  getSessionDetail: async (id: string) => (await http.get(`/v1/sessions/${encodeURIComponent(id)}`)).data,
  downloadSessionPdf: async (id: string) =>
    (await http.get(`/v1/sessions/${encodeURIComponent(id)}/documents/session-pdf`, { responseType: 'blob' })).data,
  downloadInvoicePdf: async (id: string) =>
    (await http.get(`/v1/sessions/${encodeURIComponent(id)}/documents/invoice`, { responseType: 'blob' })).data,
  submitAssessment: async (payload: { type: string; score?: number; answers?: number[] }) =>
    (await http.post('/v1/assessments/submit', payload)).data,
  addMood: async (payload: { mood: number; note?: string }) => (await http.post('/v1/mood', payload)).data,
  getMoodHistory: async () => (await http.get('/v1/mood/history')).data,
  getMoodLogs: async () => (await http.get('/patient/mood')).data,
  getMoodToday: async () =>
    withV1Fallback(
      async () => (await http.get('/patient/mood/today')).data,
      async () => ({ latest: null, entryCount: 0, date: new Date().toISOString() } as any),
    ),
  getMoodHistoryV2: async () =>
    withV1Fallback(
      async () => (await http.get('/patient/mood/history')).data,
      async () => (await http.get('/v1/mood/history')).data,
    ),
  getMoodStats: async () =>
    withV1Fallback(
      async () => (await http.get('/patient/mood/stats')).data,
      async () => {
        const history = (await http.get('/v1/mood/history')).data as any[];
        const rows = Array.isArray(history) ? history : [];
        const avg = rows.length
          ? Number((rows.reduce((sum, item) => sum + Number(item?.mood || 0), 0) / rows.length).toFixed(2))
          : 0;
        return {
          totalCheckins: rows.length,
          averageMood: avg,
          last7DaysAverage: avg,
          last30DaysAverage: avg,
          currentStreak: 0,
          longestStreak: 0,
          highestMood: rows.length ? Math.max(...rows.map((item) => Number(item?.mood || 0))) : 0,
          lowestMood: rows.length ? Math.min(...rows.map((item) => Number(item?.mood || 0))) : 0,
        };
      },
    ),
  addMoodLog: async (payload: { mood: number; note?: string }) => (await http.post('/patient/mood', payload)).data,
  getProgress: async () =>
    withV1Fallback(
      async () => (await http.get('/patient/progress')).data,
      async () => (await http.get('/v1/patient/progress')).data,
    ),
  getSubscription: async () => (await http.get('/patient/subscription')).data,
  upgradeSubscription: async () => (await http.patch('/patient/subscription/upgrade')).data,
  downgradeSubscription: async () => (await http.patch('/patient/subscription/downgrade')).data,
  cancelSubscription: async () => (await http.patch('/patient/subscription/cancel')).data,
  reactivateSubscription: async () => (await http.patch('/patient/subscription/reactivate')).data,
  setSubscriptionAutoRenew: async (autoRenew: boolean) => (await http.patch('/patient/subscription/auto-renew', { autoRenew })).data,
  getPaymentMethod: async () => (await http.get('/patient/payment-method')).data,
  updatePaymentMethod: async (payload: { cardLast4: string; cardBrand: string; expiryMonth: number; expiryYear: number }) =>
    (await http.put('/patient/payment-method', payload)).data,
  getInvoices: async () => (await http.get('/patient/invoices')).data,
  downloadInvoice: async (id: string) =>
    (await http.get(`/patient/invoices/${encodeURIComponent(id)}/download`, { responseType: 'blob' })).data,
  getExercises: async () => (await http.get('/patient/exercises')).data,
  completeExercise: async (id: string) => (await http.patch(`/patient/exercises/${encodeURIComponent(id)}/complete`)).data,
  aiChat: async (payload: { message: string; bot_type?: 'mood_ai' | 'clinical_ai' }) =>
    (await http.post('/chat/message', { message: payload.message, bot_type: payload.bot_type || 'mood_ai' })).data,
  getCurrentRisk: async (userId: string) =>
    (await http.get(`/v1/risk/${encodeURIComponent(userId)}/current`)).data,
  getNotifications: async () => (await http.get('/v1/notifications')).data,
  markNotificationRead: async (id: string) => (await http.patch(`/v1/notifications/${encodeURIComponent(id)}/read`)).data,
};
