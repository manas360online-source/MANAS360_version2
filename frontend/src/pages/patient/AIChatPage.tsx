import { useEffect, useRef, useState } from 'react';
import { CHAT_FALLBACK_MESSAGE } from '../../api/chat.api';
import { patientApi } from '../../api/patient';
import { useAuth } from '../../context/AuthContext';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const riskBadgeClass = (level: RiskLevel | null): string => {
  if (level === 'CRITICAL') return 'border-red-300 bg-red-50 text-red-700';
  if (level === 'HIGH') return 'border-orange-300 bg-orange-50 text-orange-700';
  if (level === 'MEDIUM') return 'border-amber-300 bg-amber-50 text-amber-700';
  if (level === 'LOW') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  return 'border-slate-300 bg-slate-50 text-slate-600';
};

export default function AIChatPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [thread, setThread] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const [botName, setBotName] = useState('dr meera · Mood Support AI');
  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null);
  const [riskPollingEnabled, setRiskPollingEnabled] = useState(true);
  const riskPollingEnabledRef = useRef(true);
  const riskPollingStartedRef = useRef(false);
  const riskRequestInFlightRef = useRef(false);

  useEffect(() => {
    riskPollingEnabledRef.current = riskPollingEnabled;
  }, [riskPollingEnabled]);

  useEffect(() => {
    riskPollingStartedRef.current = false;
    riskRequestInFlightRef.current = false;
    riskPollingEnabledRef.current = true;
    setRiskPollingEnabled(true);
    setRiskLevel(null);
  }, [user?.id]);

  const refreshRisk = async () => {
    if (!riskPollingEnabledRef.current) return;
    if (riskRequestInFlightRef.current) return;
    const userId = String(user?.id || '').trim();
    if (!userId) return;
    riskRequestInFlightRef.current = true;
    try {
      const res = await patientApi.getCurrentRisk(userId);
      const payload = (res as any)?.data ?? res;
      const level = String(payload?.riskLevel || payload?.risk_level || '').toUpperCase();
      if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(level)) {
        setRiskLevel(level as RiskLevel);
      }
    } catch {
      riskPollingEnabledRef.current = false;
      setRiskPollingEnabled(false);
    } finally {
      riskRequestInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!riskPollingEnabled) return;
    if (riskPollingStartedRef.current) return;
    riskPollingStartedRef.current = true;

    void refreshRisk();
    const timer = window.setInterval(() => {
      void refreshRisk();
    }, 15000);
    return () => {
      window.clearInterval(timer);
    };
  }, [user?.id, riskPollingEnabled]);

  const send = async () => {
    if (!message.trim()) return;
    const msg = message.trim();
    setThread((prev) => [...prev, { role: 'user', content: msg }]);
    setMessage('');
    setLoading(true);
    try {
      const res = await patientApi.aiChat({ message: msg, bot_type: 'mood_ai' });
      const payload = res.data ?? res;
      setBotName(`${payload?.bot_name || 'dr meera'} · Mood Support AI`);
      if (payload?.crisis_detected) {
        setShowCrisisAlert(true);
      }
      const messages = Array.isArray(payload?.messages)
        ? payload.messages.map((item: any) => ({
            role: item?.role === 'assistant' ? 'assistant' : 'user',
            content: String(item?.content || ''),
          }))
        : null;
      if (messages) {
        setThread(messages);
      } else {
        setThread((prev) => [...prev, { role: 'assistant', content: String(payload?.response || CHAT_FALLBACK_MESSAGE) }]);
      }
    } catch {
      setThread((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: CHAT_FALLBACK_MESSAGE,
        },
      ]);
    } finally {
      setLoading(false);
      if (riskPollingEnabledRef.current) {
        void refreshRisk();
      }
    }
  };

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{botName}</h1>
          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskBadgeClass(riskLevel)}`}>
            Risk status: {riskLevel || 'UNKNOWN'}
          </span>
        </div>
      <div className="responsive-card min-h-[300px] section-stack">
          {thread.length === 0 && <p className="text-sm text-slate-600">Start talking with the wellness AI assistant.</p>}
          {thread.map((m, i) => (
            <div key={i} className={`flex text-sm ${m.role === 'assistant' ? 'items-start gap-2 text-slate-900' : 'justify-end text-blue-700'}`}>
              {m.role === 'assistant' ? (
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  DM
                </span>
              ) : null}
              <div className={m.role === 'assistant' ? '' : 'max-w-[90%] rounded-lg bg-slate-100 px-3 py-2'}>
                <strong>{m.role === 'assistant' ? 'dr meera' : 'You'}:</strong> {m.content}
              </div>
            </div>
          ))}
          {loading && <p className="text-sm text-slate-500">dr meera is typing…</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 rounded border p-2"
            placeholder="How are you feeling today?"
          />
          <button onClick={send} disabled={loading} className="responsive-action-btn rounded-xl bg-slate-900 text-white">
            Send
          </button>
        </div>
        {showCrisisAlert ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-md rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 shadow-lg">
              <p className="font-semibold">Immediate Support Recommended</p>
              <p className="mt-1">
                If you are in danger, contact emergency services now. In India, call Tele-MANAS at 14416 or
                1-800-891-4416.
              </p>
              <button
                className="mt-3 rounded-md bg-red-700 px-3 py-1.5 text-white"
                onClick={() => setShowCrisisAlert(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
