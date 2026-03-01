import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { patientApi } from '../../api/patient';

export default function ProviderDetailPage() {
  const { id = '' } = useParams();
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await patientApi.getProvider(id);
      setProvider(res.data ?? res);
    })();
  }, [id]);

  if (!provider) return <div className="responsive-page"><div className="responsive-container">Loading provider...</div></div>;

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">{provider.name}</h1>
      <p className="text-slate-700">{provider.bio}</p>
      <p className="text-sm">Specialization: {provider.specialization}</p>
      <p className="text-sm">Languages: {(provider.languages || []).join(', ')}</p>
      <div>
        <h2 className="font-medium mb-2">Available Slots</h2>
        <div className="responsive-grid-2 text-sm">
          {(provider.available_slots || []).slice(0, 12).map((slot: string) => (
            <div key={slot} className="responsive-card">{new Date(slot).toLocaleString()}</div>
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to={`/book/${provider.id}`} className="responsive-action-btn inline-flex justify-center rounded-xl bg-slate-900 text-white">Book Session</Link>
      </div>
      </div>
    </div>
  );
}
