import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ResponseEvent = { messageId: string; from: string; questionId: string; answer: any; at: number; sessionId: string };

export function useTherapistSocket(opts: { url?: string; token: string | null; sessionId: string | null; totalQuestions?: number }) {
  const { url = '/', token, sessionId, totalQuestions } = opts;
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState(0);
  const [responses, setResponses] = useState<ResponseEvent[]>([]);
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const receivedIds = useRef<Set<string>>(new Set());
  const lastEventAt = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<number | null>(null);
  const maxRetries = 10;
  const baseDelay = 500;
  const maxDelay = 30000;
  const isStale = useRef(false);

  // Multi-tab coordination channel
  const bcRef = useRef<BroadcastChannel | null>(null);

  // leader election for multi-tab safety
  const [isLeader, setIsLeader] = useState(false);
  const tabIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const leaderHeartbeatRef = useRef<number | null>(null);

  const LEADER_TTL = 5000; // ms

  // helpers
  function postToBC(msg: any) {
    if (bcRef.current) bcRef.current.postMessage(msg);
  }

  // Connect only when this tab becomes leader
  const startLeaderSocket = useCallback(() => {
    if (!token || !sessionId) return;
    if (socketRef.current) return;
    if (isStale.current) return;

    function clearReconnect() {
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    }

    function computeBackoff(attempt: number) {
      const exp = Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 1000);
      return Math.min(maxDelay, baseDelay * exp + jitter);
    }

    async function resync() {
      const since = lastEventAt.current || 0;
      try {
        const res = await fetch(`${url.replace(/\/$/, '')}/v1/cbt-sessions/${sessionId}/events?since=${since}`, { credentials: 'include' });
        if (res.status === 410) {
          isStale.current = true;
          setConnected(false);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.events)) {
          for (const evt of data.events) {
            if (!evt || !evt.messageId) continue;
            if (receivedIds.current.has(evt.messageId)) continue;
            receivedIds.current.add(evt.messageId);
            if (evt.at) lastEventAt.current = Math.max(lastEventAt.current || 0, evt.at);
            setResponses((prev) => {
              const next = [...prev, evt];
              if (next.length > 1000) next.shift();
              return next;
            });
            postToBC({ type: 'answer', payload: evt });
          }
        }
      } catch (e) {
        // ignore
      }
    }

    function scheduleReconnect() {
      clearReconnect();
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current > maxRetries) {
        setConnected(false);
        return;
      }
      const delay = computeBackoff(reconnectAttempts.current);
      reconnectTimer.current = window.setTimeout(() => {
        startLeaderSocket();
      }, delay) as unknown as number;
    }

    const socket = io(url, { autoConnect: false, auth: { token }, transports: ['websocket'], path: '/socket.io' });
    socketRef.current = socket;

    socket.on('connect', async () => {
      reconnectAttempts.current = 0;
      clearReconnect();
      setConnected(true);
      socket.emit('join_session', { sessionId });
      await resync();
    });

    socket.on('disconnect', (reason: any) => {
      socketRef.current = null;
      setConnected(false);
      if (reason === 'io client disconnect') return;
      scheduleReconnect();
    });

    socket.on('presence', (p: { count: number }) => {
      setPresence(p.count || 0);
      postToBC({ type: 'presence', payload: p.count || 0 });
    });

    socket.on('typing', (t: { userId: string; isTyping: boolean }) => {
      setTyping((prev) => ({ ...prev, [t.userId]: t.isTyping }));
      if (t.isTyping) {
        window.setTimeout(() => setTyping((prev) => ({ ...prev, [t.userId]: false })), 3000);
      }
      postToBC({ type: 'typing', payload: t });
    });

    socket.on('answer_received', (evt: ResponseEvent) => {
      if (!evt || !evt.messageId) return;
      if (receivedIds.current.has(evt.messageId)) return;
      receivedIds.current.add(evt.messageId);
      if (evt.at) lastEventAt.current = Math.max(lastEventAt.current || 0, evt.at);
      setResponses((prev) => {
        const next = [...prev, evt];
        if (next.length > 1000) next.shift();
        return next;
      });
      postToBC({ type: 'answer', payload: evt });
    });

    socket.connect();
  }, [url, token, sessionId]);

  const stopLeaderSocket = useCallback(() => {
    if (!socketRef.current) return;
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    socketRef.current.removeAllListeners();
    socketRef.current.disconnect();
    socketRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    // setup BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`therapist:session:${sessionId}`);
      bcRef.current = bc;
      bc.onmessage = (m) => {
        const data = m.data;
        if (!data) return;
        if (data.type === 'answer') {
          const evt: ResponseEvent = data.payload;
          if (!receivedIds.current.has(evt.messageId)) {
            receivedIds.current.add(evt.messageId);
            setResponses((prev) => [...prev, evt]);
          }
        }
        if (data.type === 'presence') setPresence(data.payload || 0);
        if (data.type === 'typing') {
          const t = data.payload as { userId: string; isTyping: boolean };
          setTyping((prev) => ({ ...prev, [t.userId]: t.isTyping }));
        }
        if (data.type === 'leader') {
          // leader info changed
          const leaderId = data.payload;
          setIsLeader(leaderId === tabIdRef.current);
        }
      };
    }

    const key = `therapist-leader:${sessionId}`;
    function tryClaimLeadership() {
      try {
        const raw = localStorage.getItem(key);
        const now = Date.now();
        if (!raw) {
          localStorage.setItem(key, JSON.stringify({ tabId: tabIdRef.current, ts: now }));
          setIsLeader(true);
          postToBC({ type: 'leader', payload: tabIdRef.current });
          return;
        }
        const parsed = JSON.parse(raw);
        if (!parsed.ts || now - parsed.ts > LEADER_TTL) {
          localStorage.setItem(key, JSON.stringify({ tabId: tabIdRef.current, ts: now }));
          setIsLeader(true);
          postToBC({ type: 'leader', payload: tabIdRef.current });
          return;
        }
        setIsLeader(parsed.tabId === tabIdRef.current);
      } catch (e) {
        // ignore
      }
    }

    tryClaimLeadership();

    function storageHandler(e: StorageEvent) {
      if (e.key !== key) return;
      tryClaimLeadership();
    }
    window.addEventListener('storage', storageHandler);

    const hb = window.setInterval(() => {
      try {
        const raw = localStorage.getItem(key);
        const now = Date.now();
        if (!raw) {
          // no leader -> try to claim
          tryClaimLeadership();
          return;
        }
        const parsed = JSON.parse(raw);
        if (parsed.tabId === tabIdRef.current) {
          // refresh timestamp
          localStorage.setItem(key, JSON.stringify({ tabId: tabIdRef.current, ts: now }));
          postToBC({ type: 'leader', payload: tabIdRef.current });
        } else if (now - parsed.ts > LEADER_TTL) {
          // stale leader
          tryClaimLeadership();
        }
      } catch (e) {
        // ignore
      }
    }, 2000);
    leaderHeartbeatRef.current = hb;

    return () => {
      window.removeEventListener('storage', storageHandler);
      if (leaderHeartbeatRef.current) window.clearInterval(leaderHeartbeatRef.current);
      if (bcRef.current) {
        bcRef.current.close();
        bcRef.current = null;
      }
    };
  }, [sessionId]);

  // When leadership changes, start/stop socket accordingly
  useEffect(() => {
    if (isLeader) {
      startLeaderSocket();
    } else {
      stopLeaderSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeader, startLeaderSocket, stopLeaderSocket]);

  // Expose session progress calculated from totalQuestions if provided
  const sessionProgress = (() => {
    if (!totalQuestions) return null;
    return Math.min(1, responses.length / totalQuestions);
  })();

  const patientConnected = presence > 0;

  return {
    connected,
    presence,
    responses,
    typing,
    sessionProgress,
    patientConnected,
    clearResponses: () => setResponses([]),
    getLatest: () => responses[responses.length - 1] || null,
    isLeader,
    tabId: tabIdRef.current,
  };
}

export type { ResponseEvent };
