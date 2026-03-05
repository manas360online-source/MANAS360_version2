import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { patientApi } from '../../api/patient';

const asPayload = <T,>(value: any): T => (value?.data ?? value) as T;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function MyProgressPage() {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const response = await patientApi.getProgress();
        setProgress(asPayload<any>(response));
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Unable to load progress right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summary = progress?.summary || {};
  const moodTrend = Array.isArray(progress?.moodTrend) ? progress.moodTrend : [];
  const assessments = Array.isArray(progress?.assessmentTrend) ? progress.assessmentTrend : [];

  const completionChart = useMemo(
    () => [
      {
        name: 'Sessions',
        Completed: Number(summary.completedSessions || 0),
        Remaining: Math.max(0, Number(summary.totalSessions || 0) - Number(summary.completedSessions || 0)),
      },
      {
        name: 'Exercises',
        Completed: Number(summary.completedExercises || 0),
        Remaining: Math.max(0, Number(summary.totalExercises || 0) - Number(summary.completedExercises || 0)),
      },
    ],
    [summary],
  );

  if (loading) {
    return <div className="rounded-2xl border border-calm-sage/15 bg-white p-5">Loading progress...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 pb-20 lg:pb-6">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
        <h1 className="text-xl font-semibold text-charcoal">My Progress</h1>
        <p className="mt-1 text-sm text-charcoal/65">Track your therapy consistency, mood trend, and assessment movement over time.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Session Completion</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{summary.sessionCompletionRate ?? 0}%</p>
          <p className="mt-1 text-xs text-charcoal/55">{summary.completedSessions ?? 0} / {summary.totalSessions ?? 0}</p>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Exercise Completion</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{summary.exerciseCompletionRate ?? 0}%</p>
          <p className="mt-1 text-xs text-charcoal/55">{summary.completedExercises ?? 0} / {summary.totalExercises ?? 0}</p>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Mood Check-ins</p>
          <p className="mt-2 text-3xl font-semibold text-calm-sage">{summary.moodCheckins ?? 0}</p>
          <p className="mt-1 text-xs text-charcoal/55">Total logged entries</p>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/50">Latest Assessment</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{progress?.insights?.latestAssessmentScore ?? '—'}</p>
          <p className="mt-1 text-xs text-charcoal/55">{progress?.insights?.latestAssessmentSeverity ?? 'No data'}</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
          <h2 className="text-base font-semibold text-charcoal">Completion Breakdown</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionChart} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(44, 51, 51, 0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5C6666' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#7C8585' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="Completed" stackId="a" fill="#A8B5A0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Remaining" stackId="a" fill="#E6ECE3" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
          <h2 className="text-base font-semibold text-charcoal">Weekly Mood Trend</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moodTrend} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="rgba(44, 51, 51, 0.08)" vertical={false} />
                <XAxis dataKey="week" tickFormatter={(value: string) => formatDate(value)} tick={{ fontSize: 11, fill: '#5C6666' }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#7C8585' }} axisLine={false} tickLine={false} />
                <Tooltip labelFormatter={(value: string) => `Week of ${formatDate(value)}`} formatter={(value: any) => [value, 'Average mood']} />
                <Line type="monotone" dataKey="averageMood" stroke="#A8B5A0" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-charcoal">Assessment Timeline</h2>
          <p className="text-xs text-charcoal/60">Delta: {progress?.insights?.assessmentScoreDelta ?? 0}</p>
        </div>
        <div className="mt-4 divide-y divide-calm-sage/10">
          {assessments.slice().reverse().map((item: any) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-charcoal">{item.type}</p>
                <p className="text-xs text-charcoal/55">{formatDate(item.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-charcoal">{item.score}</p>
                <p className="text-xs text-charcoal/55">{item.severity}</p>
              </div>
            </div>
          ))}
          {!assessments.length && <p className="py-4 text-sm text-charcoal/60">No assessment history available.</p>}
        </div>
      </section>
    </div>
  );
}
