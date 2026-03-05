import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquare,
  TrendingUp,
  Video,
  Wallet,
} from 'lucide-react';
import {
  therapistApi,
  type MoodAccuracyResponse,
  type MoodHistoryResponse,
  type MoodPredictionResponse,
  type TherapistDashboardResponse,
} from '../../api/therapist.api';
import TherapistBadge from '../../components/therapist/dashboard/TherapistBadge';
import TherapistButton from '../../components/therapist/dashboard/TherapistButton';
import TherapistCard from '../../components/therapist/dashboard/TherapistCard';
import {
  TherapistErrorState,
  TherapistLoadingState,
} from '../../components/therapist/dashboard/TherapistDataState';
import TherapistEarningsChart from '../../components/therapist/dashboard/TherapistEarningsChart';
import TherapistProgressRing from '../../components/therapist/dashboard/TherapistProgressRing';

const formatInr = (minor: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);

const formatTime = (value: string): string =>
  new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function TherapistDashboardPage() {
  const [data, setData] = useState<TherapistDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientIdInput, setPatientIdInput] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [moodPrediction, setMoodPrediction] = useState<MoodPredictionResponse | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodHistoryResponse | null>(null);
  const [moodAccuracy, setMoodAccuracy] = useState<MoodAccuracyResponse | null>(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodError, setMoodError] = useState<string | null>(null);

  const loadMoodInsights = async (userIdRaw: string) => {
    const userId = userIdRaw.trim();
    if (!userId) return;

    setMoodLoading(true);
    setMoodError(null);
    try {
      const [prediction, history, accuracy] = await Promise.all([
        therapistApi.getPatientMoodPrediction(userId),
        therapistApi.getPatientMoodHistory(userId),
        therapistApi.getPatientMoodAccuracy(userId),
      ]);
      setMoodPrediction(prediction);
      setMoodHistory(history);
      setMoodAccuracy(accuracy);
      setSelectedPatientId(userId);
      setPatientIdInput(userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load mood prediction insights';
      setMoodError(message);
    } finally {
      setMoodLoading(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistApi.getDashboard();
      setData(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    const preload = async () => {
      const initialPatientId = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('patientId') || ''
        : '';

      if (initialPatientId) {
        await loadMoodInsights(initialPatientId);
        return;
      }

      try {
        const patients = await therapistApi.getPatients();
        const firstPatientId = String(patients?.items?.[0]?.id || '').trim();
        if (firstPatientId) {
          await loadMoodInsights(firstPatientId);
        }
      } catch {
        // keep dashboard usable even if patient preload fails
      }
    };

    void preload();
  }, []);

  const recentActualMood = useMemo(() => {
    if (!moodHistory) return [] as Array<{ label: string; value: number }>;
    const fromMoodLogs = Array.isArray(moodHistory.mood_logs)
      ? moodHistory.mood_logs
          .map((item) => ({
            date: String(item.loggedAt || item.createdAt || ''),
            value: Number(item.moodValue || 0),
          }))
          .filter((item) => item.date && Number.isFinite(item.value) && item.value > 0)
      : [];
    const fromLegacy = Array.isArray(moodHistory.legacy_mood_entries)
      ? moodHistory.legacy_mood_entries
          .map((item) => ({
            date: String(item.date || item.createdAt || ''),
            value: Number(item.moodScore || 0),
          }))
          .filter((item) => item.date && Number.isFinite(item.value) && item.value > 0)
      : [];

    const merged = [...fromMoodLogs, ...fromLegacy]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);

    return merged.map((point) => ({
      label: formatDate(point.date),
      value: point.value,
    }));
  }, [moodHistory]);

  const predictedMood = useMemo(() => {
    if (!moodPrediction?.predictions?.length) return [] as Array<{ label: string; value: number }>;
    return moodPrediction.predictions.map((point) => ({
      label: point.weekday || formatDate(point.date),
      value: Number(point.predictedMood || 0),
    }));
  }, [moodPrediction]);

  const statCards = useMemo(() => {
    if (!data) return [] as Array<{ key: string; title: string; icon: any; value: string; note: string; iconBg: string; iconColor: string }>;
    return [
      {
        key: 'todaysSessions',
        title: "Today's Sessions",
        icon: Calendar,
        value: String(data.stats.todaysSessions),
        note: `${data.stats.completedToday} completed`,
        iconBg: 'bg-sage-50',
        iconColor: 'text-sage-500',
      },
      {
        key: 'weeklyEarnings',
        title: 'This Week',
        icon: Wallet,
        value: formatInr(data.stats.weeklyEarnings),
        note: 'Therapist share',
        iconBg: 'bg-clay-50',
        iconColor: 'text-clay-500',
      },
      {
        key: 'activePatients',
        title: 'Active Patients',
        icon: MessageSquare,
        value: String(data.stats.activePatients),
        note: 'With ongoing sessions',
        iconBg: 'bg-sky-50',
        iconColor: 'text-sky-600',
      },
      {
        key: 'avgRating',
        title: 'Avg Rating',
        icon: CheckCircle2,
        value: data.stats.avgRating !== null ? String(data.stats.avgRating.toFixed(1)) : 'N/A',
        note: 'Session feedback',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
    ];
  }, [data]);

  if (loading) {
    return <TherapistLoadingState title="Loading dashboard" description="Fetching live therapist insights and session metrics." />;
  }

  if (error || !data) {
    return (
      <TherapistErrorState
        title="Could not load dashboard"
        description={error || 'Dashboard data is unavailable.'}
        onRetry={() => void loadDashboard()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-2xl font-bold text-ink-800">Good morning, {data.therapist.name} 👋</h2>
        <p className="mt-1 text-sm text-ink-500">
          You have <span className="font-semibold text-sage-500">{data.stats.todaysSessions} sessions</span> scheduled today. {data.stats.pendingNotes} notes are pending.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <TherapistCard key={card.key} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-500">{card.title}</span>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="font-display text-3xl font-bold text-ink-800">{card.value}</span>
                <span className="mb-1 text-xs font-medium text-ink-500">{card.note}</span>
              </div>
            </TherapistCard>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <TherapistCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="font-display text-base font-bold text-ink-800">Today's Sessions</h3>
              <button className="text-xs font-medium text-sage-500 hover:text-sage-600">View All →</button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[740px] w-full text-left">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-[0.08em] text-ink-500">
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Session Type</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.todaySessions.map((session) => (
                    <tr key={session.id} className="border-b border-ink-100/70 text-sm text-ink-800 hover:bg-surface-bg">
                      <td className="px-5 py-3">
                        <div className="inline-flex items-center gap-2 text-ink-500">
                          <Clock3 className="h-4 w-4" />
                          {formatTime(session.time)}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sage-50 font-display text-xs font-bold text-sage-500">
                            {session.patientInitials}
                          </span>
                          <span className="font-semibold">{session.patientName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-500">{session.sessionType}</td>
                      <td className="px-5 py-3">
                        {session.status === 'completed' ? (
                          <TherapistBadge variant="success" label="Completed" />
                        ) : session.status === 'pending' ? (
                          <TherapistBadge variant="warning" label="Pending" />
                        ) : (
                          <TherapistBadge variant="default" label="Confirmed" />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {session.status !== 'completed' ? (
                          <TherapistButton className="min-h-[36px] px-3 py-1.5 text-xs">
                            <Video className="h-3.5 w-3.5" />
                            Join
                          </TherapistButton>
                        ) : (
                          <TherapistButton variant="secondary" className="min-h-[36px] px-3 py-1.5 text-xs">
                            <FileText className="h-3.5 w-3.5" />
                            {session.noteSubmitted ? 'View Notes' : 'Write Notes'}
                          </TherapistButton>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.todaySessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-500">
                        No sessions scheduled for today.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </TherapistCard>

          <TherapistCard className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold text-ink-800">Monthly Earnings</h3>
              <div className="inline-flex rounded-lg bg-ink-100 p-0.5">
                <button className="rounded-md bg-white px-3 py-1 text-[11px] font-medium text-ink-800 shadow-soft-xs">6 Months</button>
                <button className="rounded-md px-3 py-1 text-[11px] font-medium text-ink-500">12 Months</button>
              </div>
            </div>
            <div className="h-56">
              <TherapistEarningsChart
                labels={data.earningsChart.labels}
                therapistShare={data.earningsChart.therapistShare}
                platformShare={data.earningsChart.platformShare}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-ink-100 pt-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-500">Your Share (60%)</p>
                <p className="font-display text-lg font-bold text-ink-800">{formatInr(data.stats.weeklyEarnings)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">Total Sessions</p>
                <p className="font-display text-lg font-bold text-ink-800">{data.todaySessions.length}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">Avg Per Session</p>
                <p className="font-display text-lg font-bold text-ink-800">
                  {data.todaySessions.length > 0 ? formatInr(Math.round(data.stats.weeklyEarnings / data.todaySessions.length)) : 'N/A'}
                </p>
              </div>
            </div>
          </TherapistCard>

          <section className="rounded-xl border border-clay-200 bg-clay-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-clay-100">
                  <AlertTriangle className="h-5 w-5 text-clay-500" />
                </span>
                <div>
                  <h4 className="font-display text-sm font-bold text-clay-500">{data.stats.pendingNotes} Session Notes Pending</h4>
                  <p className="mt-1 text-xs text-clay-500">
                    Please complete documentation within 24 hours of session completion.
                  </p>
                </div>
              </div>
              <TherapistButton variant="clay" className="w-full sm:w-auto">
                Write Notes
              </TherapistButton>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <TherapistCard className="overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-4">
              <h3 className="font-display text-base font-bold text-ink-800">Patient Alerts</h3>
            </div>
            <div className="divide-y divide-ink-100/60">
              {data.alerts.map((alert) => (
                <div key={alert.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-ink-800">{alert.level}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{alert.message}</p>
                  <button className={`mt-1.5 text-xs font-semibold ${alert.tone === 'danger' ? 'text-red-600' : 'text-sage-500'} hover:underline`}>
                    {alert.action} →
                  </button>
                </div>
              ))}
              {data.alerts.length === 0 ? <p className="px-5 py-6 text-sm text-ink-500">No critical patient alerts right now.</p> : null}
            </div>
          </TherapistCard>

          <TherapistCard className="p-5">
            <h3 className="mb-4 font-display text-base font-bold text-ink-800">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <TherapistButton variant="soft" className="min-h-[86px] flex-col gap-1 text-xs">Set Availability</TherapistButton>
              <TherapistButton variant="secondary" className="min-h-[86px] flex-col gap-1 text-xs">New Note</TherapistButton>
              <TherapistButton variant="secondary" className="min-h-[86px] flex-col gap-1 text-xs">Messages</TherapistButton>
              <TherapistButton variant="secondary" className="min-h-[86px] flex-col gap-1 text-xs">Assign Exercise</TherapistButton>
            </div>
          </TherapistCard>

          <TherapistCard className="p-5">
            <h3 className="mb-4 font-display text-base font-bold text-ink-800">This Week's Utilization</h3>
            <div className="mb-4 flex justify-center">
              <TherapistProgressRing value={data.utilization.percent} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-sm font-bold text-ink-800">{data.utilization.booked}</p>
                <p className="text-[10px] text-ink-500">Booked</p>
              </div>
              <div>
                <p className="font-display text-sm font-bold text-ink-800">{data.utilization.total}</p>
                <p className="text-[10px] text-ink-500">Available</p>
              </div>
              <div>
                <p className="font-display text-sm font-bold text-ink-800">{data.utilization.open}</p>
                <p className="text-[10px] text-ink-500">Open</p>
              </div>
            </div>
          </TherapistCard>

          <TherapistCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold text-ink-800">Mood Prediction Insights</h3>
              <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                <TrendingUp className="h-3.5 w-3.5" />
                7-day forecast
              </span>
            </div>

            <div className="mb-4 flex gap-2">
              <input
                value={patientIdInput}
                onChange={(event) => setPatientIdInput(event.target.value)}
                placeholder="Enter patient user ID"
                className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800 outline-none focus:border-sage-300"
              />
              <TherapistButton
                variant="secondary"
                className="px-3"
                onClick={() => void loadMoodInsights(patientIdInput)}
                disabled={moodLoading || !patientIdInput.trim()}
              >
                {moodLoading ? 'Loading...' : 'Load'}
              </TherapistButton>
            </div>

            {moodError ? <p className="mb-3 text-xs text-red-600">{moodError}</p> : null}
            {!selectedPatientId ? <p className="text-xs text-ink-500">Enter a patient ID to view prediction trend, forecast, and influencing factors.</p> : null}

            {selectedPatientId && moodPrediction ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <TherapistBadge variant="sage" label={`Trend: ${moodPrediction.trendDirection || 'STABLE'}`} />
                  <TherapistBadge variant="default" label={`Confidence: ${Number(moodPrediction.confidencePct || 0)}%`} />
                  <TherapistBadge
                    variant={moodPrediction.deteriorationAlert ? 'danger' : 'success'}
                    label={moodPrediction.deteriorationAlert ? 'Deterioration Alert' : 'No Deterioration Alert'}
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Predicted Mood Curve (Next 7 Days)</p>
                  <div className="grid grid-cols-7 gap-2">
                    {predictedMood.map((point, index) => (
                      <div key={`${point.label}-${index}`} className="rounded-lg border border-ink-100 p-2 text-center">
                        <div className="mx-auto mb-2 flex h-16 w-6 items-end rounded bg-ink-100/70">
                          <span
                            className={`w-full rounded ${point.value <= 3 ? 'bg-red-400' : 'bg-sage-400'}`}
                            style={{ height: `${Math.max(8, Math.min(100, (point.value / 10) * 100))}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-ink-500">{point.label}</p>
                        <p className="text-xs font-semibold text-ink-800">{point.value.toFixed(1)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Recent Mood History (Last 7 Points)</p>
                  <div className="grid grid-cols-7 gap-2">
                    {recentActualMood.map((point, index) => (
                      <div key={`${point.label}-${index}`} className="rounded-lg border border-ink-100 p-2 text-center">
                        <p className="text-[10px] text-ink-500">{point.label}</p>
                        <p className="text-xs font-semibold text-ink-800">{point.value.toFixed(1)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {moodPrediction.influencingFactors ? (
                  <div className="rounded-lg border border-ink-100 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Influencing Factors</p>
                    <p className="mt-2 text-xs text-ink-600">
                      <span className="font-semibold text-ink-700">Weekly pattern:</span> {moodPrediction.influencingFactors.weekly_pattern || 'N/A'}
                    </p>
                    <p className="mt-1 text-xs text-ink-600">
                      <span className="font-semibold text-ink-700">Sleep correlation:</span> {moodPrediction.influencingFactors.sleep_mood_correlation || 'N/A'}
                    </p>
                    <p className="mt-1 text-xs text-ink-600">
                      <span className="font-semibold text-ink-700">Clinical note:</span> {moodPrediction.influencingFactors.clinical_note || 'N/A'}
                    </p>
                    <p className="mt-2 text-xs text-ink-600">
                      <span className="font-semibold text-emerald-700">Top positive:</span>{' '}
                      {(moodPrediction.influencingFactors.top_positive_factors || []).join(', ') || 'None'}
                    </p>
                    <p className="mt-1 text-xs text-ink-600">
                      <span className="font-semibold text-red-700">Top negative:</span>{' '}
                      {(moodPrediction.influencingFactors.top_negative_factors || []).join(', ') || 'None'}
                    </p>
                  </div>
                ) : null}

                {moodAccuracy ? (
                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-ink-100 p-3 text-center">
                    <div>
                      <p className="text-[10px] text-ink-500">MAE</p>
                      <p className="font-display text-sm font-bold text-ink-800">{Number(moodAccuracy.mae || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-500">Within ±2</p>
                      <p className="font-display text-sm font-bold text-ink-800">{Number(moodAccuracy.within2Pct || 0).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-500">Target</p>
                      <p className={`font-display text-sm font-bold ${moodAccuracy.targetMet ? 'text-emerald-700' : 'text-clay-500'}`}>
                        {moodAccuracy.targetMet ? 'Met' : 'Below'}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </TherapistCard>

          <TherapistCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="font-display text-base font-bold text-ink-800">Messages</h3>
              <TherapistBadge variant={data.stats.unreadMessages > 0 ? 'danger' : 'default'} label={`${data.stats.unreadMessages} unread`} />
            </div>
            <div className="divide-y divide-ink-100/60">
              {data.recentMessages.map((message) => (
                <button key={message.id} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-bg">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage-50 font-display text-[11px] font-bold text-sage-500">
                    {message.title.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-800">{message.title}</span>
                    <span className="block truncate text-xs text-ink-500">{message.text}</span>
                  </span>
                  <span className="text-[10px] text-ink-500">{formatTime(message.createdAt)}</span>
                </button>
              ))}
              {data.recentMessages.length === 0 ? <p className="px-5 py-6 text-sm text-ink-500">No recent messages.</p> : null}
            </div>
          </TherapistCard>
        </div>
      </section>
    </div>
  );
}
