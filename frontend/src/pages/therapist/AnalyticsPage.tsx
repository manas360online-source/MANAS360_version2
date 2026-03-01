import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalyticsSummary, getAnalyticsTimeSeries, getAnalyticsDropoff } from '../../api/analytics.api';
import DateRangePicker from '../../components/Analytics/DateRangePicker';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

const toISO = (d: Date) => d.toISOString();

const AnalyticsPage: React.FC = () => {
  const defaultTo = new Date();
  const defaultFrom = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const [from, setFrom] = useState(toISO(defaultFrom));
  const [to, setTo] = useState(toISO(defaultTo));
  const [granularity, setGranularity] = useState<'week'|'day'|'month'>('week');

  const summaryQ = useQuery(['analytics','summary', from, to], () => getAnalyticsSummary(from, to));
  const tsQ = useQuery(['analytics','timeseries', from, to, granularity], () => getAnalyticsTimeSeries(from, to, granularity));
  const dropQ = useQuery(['analytics','dropoff', from, to], () => getAnalyticsDropoff(from, to));

  const series = useMemo(() => tsQ.data?.data ?? [], [tsQ.data]);

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold">Therapist Analytics</h2>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <DateRangePicker from={from} to={to} onChange={(f,t) => { setFrom(new Date(f).toISOString()); setTo(new Date(t).toISOString()); }} />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Granularity</label>
          <select value={granularity} onChange={(e) => setGranularity(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      <div className="responsive-grid-3">
        <div className="responsive-card bg-white">
          <div className="text-sm text-gray-500">Completion Rate</div>
          <div className="text-2xl font-semibold mt-2">{summaryQ.data?.data?.completionRate ?? '—'}%</div>
        </div>
        <div className="responsive-card bg-white">
          <div className="text-sm text-gray-500">Avg Session (min)</div>
          <div className="text-2xl font-semibold mt-2">{summaryQ.data?.data?.avgMinutes ?? '—'}</div>
        </div>
        <div className="responsive-card bg-white">
          <div className="text-sm text-gray-500">Sessions</div>
          <div className="text-2xl font-semibold mt-2">{summaryQ.data?.data?.sessions ?? '—'}</div>
        </div>
      </div>

      <div className="responsive-grid-2">
        <div className="responsive-card bg-white">
          <div className="text-sm text-gray-600 mb-2">Completion Rate Over Time</div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="completionRate" stroke="#1976d2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="responsive-card bg-white">
          <div className="text-sm text-gray-600 mb-2">Avg Duration (minutes)</div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgMinutes" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="responsive-card bg-white">
        <div className="text-sm text-gray-600 mb-2">Drop-off distribution</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {dropQ.data?.data?.length ? (
            dropQ.data.data.map((d: any) => (
              <div key={d.questionIndex} className="p-2 border rounded">
                <div className="text-xs text-gray-500">Q{d.questionIndex}</div>
                <div className="text-lg font-semibold">{d.sessions}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No data</div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
