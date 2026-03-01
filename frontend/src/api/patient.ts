import { http } from '../lib/http';

export const patientApi = {
  getDashboard: async () => (await http.get('/v1/patient/dashboard')).data,
  listProviders: async (params?: { specialization?: string; language?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }) =>
    (await http.get('/v1/providers', { params })).data,
  getProvider: async (id: string) => (await http.get(`/v1/providers/${encodeURIComponent(id)}`)).data,
  bookSession: async (payload: { providerId: string; scheduledAt: string; durationMinutes?: number; amountMinor?: number }) =>
    (await http.post('/v1/sessions/book', payload)).data,
  verifyPayment: async (payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    (await http.post('/v1/payments/verify', payload)).data,
  getUpcomingSessions: async () => (await http.get('/v1/sessions/upcoming')).data,
  getSessionHistory: async () => (await http.get('/v1/sessions/history')).data,
  submitAssessment: async (payload: { type: string; score?: number; answers?: number[] }) =>
    (await http.post('/v1/assessments/submit', payload)).data,
  addMood: async (payload: { mood: number; note?: string }) => (await http.post('/v1/mood', payload)).data,
  getMoodHistory: async () => (await http.get('/v1/mood/history')).data,
  aiChat: async (payload: { message: string }) => (await http.post('/v1/ai/chat', payload)).data,
  getNotifications: async () => (await http.get('/v1/notifications')).data,
  markNotificationRead: async (id: string) => (await http.patch(`/v1/notifications/${encodeURIComponent(id)}/read`)).data,
};
