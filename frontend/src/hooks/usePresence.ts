import { useEffect, useRef, useState } from 'react';

function clientIdForTab() {
  const key = 'manas360:presence:clientId';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function usePresence({ sessionId, role, token }: { sessionId: string | null; role: 'patient' | 'therapist'; token?: string | null }) {
  const clientId = useRef<string | null>(null);
  const [presence, setPresence] = useState<Array<{ userId: string; role: string; clientCount: number }>>([]);
  const heartbeatInterval = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    clientId.current = clientIdForTab();

    const sendHeartbeat = async () => {
      try {
        await fetch('/v1/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
          body: JSON.stringify({ sessionId, clientId: clientId.current, role }),
        });
      } catch (e) {
        // ignore
      }
    };

    const refreshPresence = async () => {
      try {
        const r = await fetch(`/v1/presence/session/${sessionId}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        if (!r.ok) return;
        const body = await r.json();
        setPresence(body.presence || []);
      } catch (e) {
        // ignore
      }
    };

    // initial heartbeat and presence fetch
    void sendHeartbeat();
    void refreshPresence();

    heartbeatInterval.current = window.setInterval(() => {
      void sendHeartbeat();
      void refreshPresence();
    }, 5000);

    const onUnload = () => {
      try {
        const payload = JSON.stringify({ sessionId, clientId: clientId.current, role });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/v1/presence/unload', payload);
        } else {
          // best-effort
          fetch('/v1/presence/unload', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: payload });
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('beforeunload', onUnload);

    return () => {
      if (heartbeatInterval.current) window.clearInterval(heartbeatInterval.current as number);
      window.removeEventListener('beforeunload', onUnload);
      // best-effort unload call
      try {
        const payload = JSON.stringify({ sessionId, clientId: clientId.current, role });
        if (navigator.sendBeacon) navigator.sendBeacon('/v1/presence/unload', payload);
      } catch (e) {}
    };
  }, [sessionId, role, token]);

  return { presence, clientId: clientId.current };
}
