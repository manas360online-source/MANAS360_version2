import client from './client';

export const getAnalyticsSummary = async (from?: string, to?: string) => {
  const qp = [] as string[];
  if (from) qp.push(`from=${encodeURIComponent(from)}`);
  if (to) qp.push(`to=${encodeURIComponent(to)}`);
  const url = `/v1/therapists/me/analytics/summary${qp.length ? '?' + qp.join('&') : ''}`;
  const res = await client.get(url);
  return res.data;
};

export const getAnalyticsTimeSeries = async (from?: string, to?: string, granularity: 'day'|'week'|'month'='week') => {
  const qp = [] as string[];
  if (from) qp.push(`from=${encodeURIComponent(from)}`);
  if (to) qp.push(`to=${encodeURIComponent(to)}`);
  qp.push(`granularity=${encodeURIComponent(granularity)}`);
  const url = `/v1/therapists/me/analytics/sessions?${qp.join('&')}`;
  const res = await client.get(url);
  return res.data;
};

export const getAnalyticsDropoff = async (from?: string, to?: string, templateId?: string) => {
  const qp = [] as string[];
  if (from) qp.push(`from=${encodeURIComponent(from)}`);
  if (to) qp.push(`to=${encodeURIComponent(to)}`);
  if (templateId) qp.push(`templateId=${encodeURIComponent(templateId)}`);
  const url = `/v1/therapists/me/analytics/dropoff${qp.length ? '?' + qp.join('&') : ''}`;
  const res = await client.get(url);
  return res.data;
};
