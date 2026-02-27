import usePresence from '../hooks/usePresence';

export default function PresenceIndicator({ sessionId, role, token }: { sessionId: string | null; role: 'patient' | 'therapist'; token?: string | null }) {
  const { presence } = usePresence({ sessionId, role, token });

  if (!sessionId) return null;

  const patients = presence.filter((p) => p.role.toLowerCase().includes('patient'));
  const therapists = presence.filter((p) => p.role.toLowerCase().includes('therapist'));

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div>Patients online: {patients.reduce((s, p) => s + p.clientCount, 0)}</div>
      <div>Therapists online: {therapists.reduce((s, p) => s + p.clientCount, 0)}</div>
    </div>
  );
}
