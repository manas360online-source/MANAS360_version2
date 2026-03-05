import { useEffect, useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { patientApi } from '../../api/patient';

const moodLabels: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Great',
};

const moodEmoji: Record<number, string> = {
  1: '😢',
  2: '😔',
  3: '😐',
  4: '🙂',
  5: '😊',
};

const asPayload = <T,>(value: any): T => (value?.data ?? value) as T;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

type MoodItem = {
  id: string;
  mood: number;
  note?: string | null;
  created_at: string;
};

export default function MoodTrackerPage() {
  const [mood, setMood] = useState(3);
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<MoodItem[]>([]);
  const [today, setToday] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [todayRes, historyRes, statsRes] = await Promise.all([
      patientApi.getMoodToday(),
      patientApi.getMoodHistoryV2(),
      patientApi.getMoodStats(),
    ]);

    const todayData = asPayload<any>(todayRes);
    const historyData = asPayload<MoodItem[]>(historyRes);
    const statsData = asPayload<any>(statsRes);

    setToday(todayData || null);
    setHistory(Array.isArray(historyData) ? historyData : []);
    setStats(statsData || null);

    if (todayData?.latest?.mood) {
      setMood(Number(todayData.latest.mood));
      setNote(String(todayData.latest.note || ''));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await load();
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Unable to load mood tracker right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const chartData = useMemo(() => {
    return [...history]
      .slice(0, 14)
      .reverse()
      .map((item) => ({ day: formatDate(item.created_at), mood: Number(item.mood || 0) }));
  }, [history]);

  const saveMood = async () => {
    try {
      setSaving(true);
      await patientApi.addMoodLog({ mood, note: note.trim() || undefined });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save mood check-in.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-calm-sage/15 bg-white p-5">Loading mood tracker...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 pb-20 lg:pb-6">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
        <h1 className="text-xl font-semibold text-charcoal">Mood Tracker</h1>
        <p className="mt-1 text-sm text-charcoal/65">Log today’s mood and keep a consistent check-in habit.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMood(value)}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition ${
                mood === value ? 'bg-calm-sage/20 ring-2 ring-calm-sage/45' : 'bg-cream hover:bg-calm-sage/10'
              }`}
              aria-label={`Select mood ${moodLabels[value]}`}
            >
              {moodEmoji[value]}
            </button>
          ))}
        </div>

        <div className="mt-3 text-sm text-charcoal/70">Selected: {moodLabels[mood]}</div>

        <label className="mt-4 block text-sm font-medium text-charcoal" htmlFor="mood-note">
          Note (optional)
        </label>
        <textarea
          id="mood-note"
          className="mt-2 min-h-[96px] w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-charcoal outline-none transition focus:border-calm-sage/40"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What influenced your mood today?"
        />

        <button
          type="button"
          onClick={() => void saveMood()}
          disabled={saving}
          className="mt-4 inline-flex min-h-[40px] items-center rounded-xl bg-charcoal px-4 text-sm font-medium text-cream transition hover:opacity-95 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Mood'}
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/55">Today’s Check-ins</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{today?.entryCount ?? 0}</p>
          <p className="mt-1 text-xs text-charcoal/55">Latest: {today?.latest?.mood ? `${moodEmoji[today.latest.mood]} ${moodLabels[today.latest.mood]}` : 'No check-in yet'}</p>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/55">Current Streak</p>
          <p className="mt-2 text-3xl font-semibold text-charcoal">{stats?.currentStreak ?? 0}</p>
          <p className="mt-1 text-xs text-charcoal/55">Longest: {stats?.longestStreak ?? 0} days</p>
        </article>

        <article className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
          <p className="text-xs uppercase tracking-wider text-charcoal/55">Average Mood (7 days)</p>
          <p className="mt-2 text-3xl font-semibold text-calm-sage">{stats?.last7DaysAverage ?? 0}</p>
          <p className="mt-1 text-xs text-charcoal/55">30 days: {stats?.last30DaysAverage ?? 0}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
        <h2 className="text-base font-semibold text-charcoal">Mood Trend (Last 14 entries)</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(44, 51, 51, 0.08)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5C6666' }} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#7C8585' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: any) => [`${moodLabels[Number(value)] || value}`, 'Mood']} />
              <Line type="monotone" dataKey="mood" stroke="#A8B5A0" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
        <h2 className="text-base font-semibold text-charcoal">Recent Entries</h2>
        <div className="mt-4 divide-y divide-calm-sage/10">
          {history.slice(0, 10).map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-charcoal">{moodEmoji[item.mood]} {moodLabels[item.mood] || `${item.mood}/5`}</p>
                <p className="text-xs text-charcoal/55">{formatDateTime(item.created_at)}</p>
              </div>
              <p className="max-w-[60%] text-right text-sm text-charcoal/70">{item.note || '—'}</p>
            </div>
          ))}
          {!history.length && <p className="py-4 text-sm text-charcoal/60">No mood entries yet.</p>}
        </div>
      </section>
    </div>
  );
}
