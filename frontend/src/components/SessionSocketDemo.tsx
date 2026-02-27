import React, { useMemo, useState } from 'react';
import { usePatientSocket } from '../hooks/usePatientSocket';
import useAuthToken from '../hooks/useAuthToken';
import PresenceIndicator from './PresenceIndicator';

export default function SessionSocketDemo({ token: tokenProp, sessionId }: { token?: string | null; sessionId: string | null }) {
  const { token: tokenFromHook } = useAuthToken();
  const token = tokenProp ?? tokenFromHook;
  const { status, sendAnswer, pendingCount, isStale } = usePatientSocket({ token, sessionId });
  const [questionId, setQuestionId] = useState('q1');
  const [answer, setAnswer] = useState('');
  const [lastResult, setLastResult] = useState<string | null>(null);

  const statusColor = useMemo(() => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'connecting':
        return 'orange';
      case 'reconnecting':
        return 'orange';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  }, [status]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const res = sendAnswer(questionId, { text: answer });
    if (!res.ok) {
      setLastResult(`Rejected: ${res.reason}`);
      return;
    }
    setLastResult(res.queued ? 'Queued (offline) — will send on reconnect' : 'Sent');
    setAnswer('');
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6, maxWidth: 520 }}>
      {typeof (isStale as any) === 'function' && (isStale as any)() && (
        <div style={{ background: '#fff3cd', padding: 8, marginBottom: 8, borderRadius: 4 }}>
          Session ended or stale — live updates paused.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: statusColor }} />
        <strong>{status}</strong>
        <div style={{ marginLeft: 'auto' }}>
          <PresenceIndicator sessionId={sessionId} role={'patient'} token={token} />
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label>Question ID</label>
          <input value={questionId} onChange={(e) => setQuestionId(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Answer</label>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="submit"
            disabled={pendingCount() > 0}
            aria-disabled={pendingCount() > 0}
            aria-live="polite"
            aria-busy={pendingCount() > 0}
          >
            Submit Answer
          </button>
          <div aria-live="polite">Pending local: {pendingCount()}</div>
        </div>
      </form>

      {lastResult && <div style={{ marginTop: 8 }}>{lastResult}</div>}
    </div>
  );
}
