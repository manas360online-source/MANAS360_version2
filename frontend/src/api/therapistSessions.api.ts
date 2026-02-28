import client from './client';

export type TherapistSessionsListParams = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  patient?: string;
  from?: string;
  to?: string;
  type?: string;
  completion?: string;
};

export const listMyTherapistSessions = async (params: TherapistSessionsListParams = {}) => {
  const qp = [] as string[];
  if (params.page) qp.push(`page=${params.page}`);
  if (params.limit) qp.push(`limit=${params.limit}`);
  if (params.status) qp.push(`status=${encodeURIComponent(params.status)}`);
  if (params.search) qp.push(`search=${encodeURIComponent(params.search)}`);
  if (params.patient) qp.push(`patient=${encodeURIComponent(params.patient)}`);
  if (params.from) qp.push(`from=${encodeURIComponent(params.from)}`);
  if (params.to) qp.push(`to=${encodeURIComponent(params.to)}`);
  if (params.type) qp.push(`type=${encodeURIComponent(params.type)}`);
  if (params.completion) qp.push(`completion=${encodeURIComponent(params.completion)}`);
  const url = `/v1/therapist/me/sessions${qp.length ? '?' + qp.join('&') : ''}`;
  const res = await client.get(url);
  // normalize backend shape to front-end `TherapistSession` shape
  const data = res.data as any;
  const items = (data.items || data.sessions || []).map((s: any) => ({
    id: s.sessionId ?? s.id,
    title: s.title ?? s.bookingReferenceId ?? null,
    patientName: s.patient?.name ?? s.patientName ?? s.patientName ?? null,
    patientEmail: s.patient?.email ?? s.patientEmail ?? null,
    patientId: s.patient?.id ?? s.patientId ?? null,
    dateTime: s.dateTime ? new Date(s.dateTime).toISOString() : s.scheduledAt ?? null,
    status: s.timing ?? s.status ?? 'upcoming',
    raw: s,
  }));

  return { items, meta: data.meta ?? data.pagination };
};

  export const getMyTherapistSessionDetail = async (sessionId: string) => {
    const res = await client.get(`/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}`);
    return res.data;
  };

  export const exportMyTherapistSession = async (sessionId: string, format: 'csv' | 'json' = 'csv') => {
    const url = `/api/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}/export?format=${format}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    return blob;
  };

  export const addResponseNote = async (sessionId: string, responseId: string, content: string) => {
    const res = await client.post(`/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}/notes`, { content });
    return res.data;
  };

  export const listResponseNotes = async (sessionId: string, responseId: string) => {
    const res = await client.get(`/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}/notes`);
    return res.data;
  };

  export const getResponseNote = async (sessionId: string, responseId: string, noteId: string) => {
    const res = await client.get(`/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}/notes/${encodeURIComponent(noteId)}`);
    return res.data;
  };

  export const updateResponseNote = async (sessionId: string, responseId: string, noteId: string, content: string) => {
    const url = `/api/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}/notes/${encodeURIComponent(noteId)}`;
    const res = await fetch(url, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    const data = await res.json();
    return data;
  };

  export const deleteResponseNote = async (sessionId: string, responseId: string, noteId: string) => {
    const url = `/api/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}/responses/${encodeURIComponent(responseId)}/notes/${encodeURIComponent(noteId)}`;
    const res = await fetch(url, { method: 'DELETE', credentials: 'same-origin' });
    const data = await res.json();
    return data;
  };

  export const rescheduleSession = async (sessionId: string, newStartAt: string) => {
    const res = await fetch(`/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}/actions/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newStartAt }),
    });
    if (!res.ok) throw new Error('Reschedule failed');
    return res.json();
  };

  export const cancelSession = async (sessionId: string, reason?: string) => {
    const res = await fetch(`/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}/actions/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Cancel failed');
    return res.json();
  };

  export const sendSessionReminder = async (sessionId: string, via: 'email' | 'sms' | 'both' = 'email', templateId?: string) => {
    const res = await fetch(`/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}/actions/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ via, templateId }),
    });
    if (!res.ok) throw new Error('Reminder failed');
    return res.json();
  };

  export const startLiveSession = async (sessionId: string, mode: 'video' | 'call' = 'video') => {
    const res = await fetch(`/v1/therapist/me/sessions/${encodeURIComponent(sessionId)}/actions/start-live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw new Error('Start live failed');
    return res.json();
  };

  export const duplicateTemplate = async (templateId: string, title?: string) => {
    const res = await fetch(`/v1/therapist/me/templates/${encodeURIComponent(templateId)}/actions/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Duplicate failed');
    return res.json();
  };
