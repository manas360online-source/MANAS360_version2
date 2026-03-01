import { useEffect, useState } from 'react';
import { http } from '../../lib/http';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    (async () => {
      const me = await http.get('/v1/users/me');
      const p = me.data?.data ?? me.data;
      setProfile(p);
      setFirstName(p.firstName || '');
      setLastName(p.lastName || '');
    })();
  }, []);

  const save = async () => {
    const res = await http.patch('/v1/users/me', { firstName, lastName });
    setProfile(res.data?.data ?? res.data);
  };

  if (!profile) return <div className="responsive-page"><div className="responsive-container">Loading profile...</div></div>;

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">Profile</h1>
      <div className="responsive-card section-stack">
        <div className="text-sm text-slate-600">Email: {profile.email || 'Not set'}</div>
        <label className="block">
          <span className="text-sm">First Name</span>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block">
          <span className="text-sm">Last Name</span>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={save} className="responsive-action-btn rounded-xl bg-slate-900 text-white">Save</button>
        </div>
      </div>
      </div>
    </div>
  );
}
