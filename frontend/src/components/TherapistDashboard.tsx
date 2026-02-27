import { useTherapistSocket } from '../hooks/useTherapistSocket';
import useAuthToken from '../hooks/useAuthToken';
import PresenceIndicator from './PresenceIndicator';

export default function TherapistDashboard({ token: tokenProp, sessionId, totalQuestions }: { token?: string | null; sessionId: string | null; totalQuestions?: number }) {
  const { token: tokenFromHook } = useAuthToken();
  const token = tokenProp ?? tokenFromHook;
  const { connected, responses, typing, sessionProgress, patientConnected, isLeader, tabId, isStale } = useTherapistSocket({ token, sessionId, totalQuestions });

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <h2>Therapist Dashboard</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div>Status: {connected ? 'Connected' : 'Disconnected'}</div>
        <div>Patient connected: {patientConnected ? 'Yes' : 'No'}</div>
        <div>Leader: {isLeader ? 'This tab' : tabId || 'unknown'}</div>
        <PresenceIndicator sessionId={sessionId} role={'therapist'} token={token} />
        <div style={{ marginLeft: 'auto' }}>
          Progress: {sessionProgress === null ? 'N/A' : `${Math.round((sessionProgress || 0) * 100)}%`}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {isStale && isStale() && (
          <div style={{ background: '#fff3cd', padding: 8, borderRadius: 6, marginBottom: 8 }}>Session ended or stale — live updates paused.</div>
        )}
        <strong>Typing:</strong>
        <div>{Object.entries(typing).filter(([, v]) => v).map(([id]) => <div key={id}>{id} is typing…</div>)}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Responses ({responses.length})</strong>
        <div style={{ border: '1px solid #eee', padding: 8, marginTop: 8 }}>
          {responses.length === 0 && <div>No responses yet</div>}
          {responses.map((r) => (
            <div key={r.messageId} style={{ padding: 8, borderBottom: '1px solid #fafafa' }}>
              <div style={{ fontSize: 12, color: '#666' }}>{new Date(r.at).toLocaleTimeString()} — {r.from}</div>
              <div>Q: {r.questionId}</div>
              <div>Answer: {typeof r.answer === 'string' ? r.answer : JSON.stringify(r.answer)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
