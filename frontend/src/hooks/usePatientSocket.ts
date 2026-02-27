import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { addOutbox, getAllOutbox, removeOutbox } from '../utils/outbox';

type Status = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

type AnswerResult = { ok: boolean; queued?: boolean; reason?: string };

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function usePatientSocket(opts: { url?: string; token: string | null; sessionId: string | null }) {
  const { url = '/', token, sessionId } = opts;
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<Status>('disconnected');
  const [presenceCount, setPresenceCount] = useState<number>(0);
  const pendingRef = useRef<Map<string, { messageId: string; questionId: string }>>(new Map());

  // Reconnect control (manual exponential backoff)
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<number | null>(null);
  const maxRetries = 10;
  const baseDelay = 500; // ms
  const maxDelay = 30000; // ms

  // session resync tracking
  const lastEventAt = useRef<number | null>(null);
  const isStale = useRef(false);

  function clearReconnectTimer() {
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

  async function resyncMissed() {
    if (!sessionId) return;
    const since = lastEventAt.current || 0;
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/v1/cbt-sessions/${sessionId}/events?since=${since}`, { credentials: 'include' });
      if (res.status === 410) {
        // session stale/ended
        isStale.current = true;
        setStatus('disconnected');
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.events)) {
        for (const evt of data.events) {
          // process events the same way socket would
          if (evt.at) lastEventAt.current = Math.max(lastEventAt.current || 0, evt.at);
          // server-side will dedupe; here we just invoke ack removal if needed
          if (evt.type === 'answer_ack' && evt.questionId) {
            if (pendingRef.current.has(evt.questionId)) pendingRef.current.delete(evt.questionId);
            if (evt.messageId) await removeOutbox(evt.messageId);
          }
        }
      }
    } catch (e) {
      // ignore; next reconnect attempt will retry
    }
  }

  function scheduleReconnect() {
    clearReconnectTimer();
    reconnectAttempts.current += 1;
    if (reconnectAttempts.current > maxRetries) {
      setStatus('disconnected');
      return;
    }
    const delay = computeBackoff(reconnectAttempts.current);
    setStatus('reconnecting');
    reconnectTimer.current = window.setTimeout(() => {
      attemptConnect();
    }, delay) as unknown as number;
  }

  function stopSocket() {
    if (!socketRef.current) return;
    socketRef.current.removeAllListeners();
    socketRef.current.disconnect();
    socketRef.current = null;
  }

  const attemptConnect = useCallback(() => {
    if (!token || !sessionId) return;
    if (socketRef.current) return;
    if (isStale.current) return;

    setStatus((s) => (s === 'connected' ? s : 'connecting'));

    // create socket but disable socket.io auto-reconnect
    const socket = io(url, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token },
      reconnection: false,
      path: '/socket.io',
    });

    socketRef.current = socket;

    socket.on('connect', async () => {
      reconnectAttempts.current = 0;
      clearReconnectTimer();
      setStatus('connected');
      // join the session room
      if (sessionId) socket.emit('join_session', { sessionId });
      // resync any missed events via REST endpoint
      await resyncMissed();
      // flush outbox
      try {
        const queued = await getAllOutbox();
        for (const item of queued) {
          socket.emit('answer_submitted', { sessionId: item.sessionId, questionId: item.questionId, answer: item.answer, messageId: item.messageId });
        }
      } catch (e) {
        // ignore
      }
    });

    socket.on('connect_error', (err: any) => {
      setStatus('error');
      console.warn('socket connect_error', err?.message || err);
      stopSocket();
      scheduleReconnect();
    });

    socket.on('disconnect', (reason: any) => {
      socketRef.current = null;
      if (reason === 'io client disconnect') {
        setStatus('disconnected');
      } else {
        // attempt manual reconnect
        scheduleReconnect();
      }
    });

    socket.on('presence', (p: { count: number }) => setPresenceCount(p.count || 0));

    socket.on('answer_ack', async (ack: { messageId?: string; questionId?: string; status?: string; pendingDelivery?: boolean }) => {
      const q = ack?.questionId;
      const mid = ack?.messageId;
      if (q && pendingRef.current.has(q)) pendingRef.current.delete(q);
      if (mid) {
        try {
          await removeOutbox(mid);
        } catch (e) {}
      }
    });

    socket.on('joined', () => {});
    socket.on('join_denied', (info: any) => console.warn('join denied', info));

    // finally connect
    socket.connect();
  }, [url, token, sessionId]);

  const disconnect = useCallback(() => {
    isStale.current = false;
    clearReconnectTimer();
    stopSocket();
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    // connect when token + sessionId present
    if (token && sessionId && !socketRef.current && !isStale.current) attemptConnect();
    return () => {
      clearReconnectTimer();
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, sessionId, attemptConnect]);

  // prevent duplicate submissions: keyed by questionId
  const sendAnswer = useCallback(
    (questionId: string, answer: any): AnswerResult => {
      if (!questionId) return { ok: false, reason: 'missing_questionId' };
      if (pendingRef.current.has(questionId)) return { ok: false, reason: 'duplicate' };
      const messageId = makeId();
      pendingRef.current.set(questionId, { messageId, questionId });

      // persist to IndexedDB outbox
      void addOutbox({ messageId, sessionId: sessionId || '', questionId, answer }).catch(() => {});

      const socket = socketRef.current;
      if (!socket || socket.connected === false) {
        return { ok: true, queued: true };
      }

      try {
        socket.emit('answer_submitted', { sessionId, questionId, answer, messageId });
        return { ok: true };
      } catch (e: any) {
        return { ok: true, queued: true };
      }
    },
    [sessionId]
  );

  // periodic flush of outbox while connected
  useEffect(() => {
    let t: number | null = null;
    const loop = async () => {
      try {
        if (!socketRef.current || !socketRef.current.connected) return;
        const queued = await getAllOutbox();
        for (const item of queued) {
          socketRef.current.emit('answer_submitted', { sessionId: item.sessionId, questionId: item.questionId, answer: item.answer, messageId: item.messageId });
        }
      } catch (e) {}
      t = window.setTimeout(loop, 5000) as unknown as number;
    };
    t = window.setTimeout(loop, 5000) as unknown as number;
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, []);

  return {
    status,
    presenceCount,
    sendAnswer,
    disconnect,
    connect: attemptConnect,
    pendingCount: () => pendingRef.current.size,
    isStale: () => isStale.current,
  };
}

export type { Status };
