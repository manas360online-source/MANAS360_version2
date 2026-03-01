import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientApi } from '../../api/patient';

export default function SessionsPage() {
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [u, h] = await Promise.all([patientApi.getUpcomingSessions(), patientApi.getSessionHistory()]);
      setUpcoming((u.data ?? u) || []);
      setHistory((h.data ?? h) || []);
    })();
  }, []);

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">My Sessions</h1>
      <section className="responsive-card">
        <h2 className="font-medium mb-2">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-600">No upcoming sessions</p>
        ) : (
          <div className="section-stack">
            {upcoming.map((s) => (
              <div className="flex items-center justify-between gap-4" key={s.id}>
                <p className="text-sm">{new Date(s.scheduled_at).toLocaleString()} - {s.provider?.name}</p>
                {s.agora_channel && s.agora_token ? (
                  <Link to={`/sessions/${s.id}/live`} className="text-sm text-blue-600">Join Live</Link>
                ) : (
                  <span className="text-xs text-slate-500">Live link pending</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="responsive-card">
        <h2 className="font-medium mb-2">History</h2>
        {history.length === 0 ? <p className="text-sm text-slate-600">No session history</p> : history.map((s) => <p className="text-sm" key={s.id}>{new Date(s.scheduled_at).toLocaleString()} - {s.status}</p>)}
      </section>
      </div>
    </div>
  );
}
