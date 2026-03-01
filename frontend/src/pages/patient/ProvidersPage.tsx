import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientApi } from '../../api/patient';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await patientApi.listProviders({ limit: 20 });
        const payload = res.data ?? res;
        setProviders(payload.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="responsive-page"><div className="responsive-container">Loading providers...</div></div>;

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">Therapist Discovery</h1>
      <div className="responsive-grid-3">
        {providers.map((p) => (
          <div key={p.id} className="responsive-card">
            <h2 className="font-medium">{p.name}</h2>
            <p className="text-sm text-slate-600">{p.specialization}</p>
            <p className="text-sm mt-1">Rate: ₹{(p.session_rate / 100).toFixed(0)}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <Link to={`/providers/${p.id}`} className="text-blue-600">View</Link>
              <Link to={`/book/${p.id}`} className="text-blue-600">Book</Link>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
