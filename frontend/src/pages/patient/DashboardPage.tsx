import { useEffect, useState } from 'react';
import { patientApi } from '../../api/patient';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await patientApi.getDashboard();
        setData(res.data ?? res);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="responsive-page"><div className="responsive-container">Loading dashboard...</div></div>;

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">Patient Dashboard</h1>
      <div className="responsive-grid-2">
        <div className="responsive-card">
          <h2 className="font-medium mb-2">Upcoming Sessions</h2>
          {(data?.upcomingSessions || []).length === 0 ? <p className="text-sm text-slate-600">No upcoming sessions</p> : (data.upcomingSessions || []).map((s: any) => <p key={s.id} className="text-sm">{new Date(s.scheduledAt).toLocaleString()} - {s.provider?.name}</p>)}
        </div>
        <div className="responsive-card">
          <h2 className="font-medium mb-2">Last Assessment</h2>
          {data?.lastAssessment ? <p className="text-sm">{data.lastAssessment.type}: {data.lastAssessment.result_level} ({data.lastAssessment.score})</p> : <p className="text-sm text-slate-600">No assessments yet</p>}
        </div>
      </div>
      <div className="responsive-card">
        <h2 className="font-medium mb-2">Recent Mood Logs</h2>
        {(data?.recentMoodLogs || []).length === 0 ? <p className="text-sm text-slate-600">No mood logs yet</p> : (data.recentMoodLogs || []).map((m: any, i: number) => <p key={i} className="text-sm">{new Date(m.date || m.created_at).toLocaleDateString()} - Mood {m.moodScore ?? m.mood}</p>)}
      </div>
      </div>
    </div>
  );
}
