import { useState } from 'react';
import { patientApi } from '../../api/patient';

export default function AIChatPage() {
  const [message, setMessage] = useState('');
  const [thread, setThread] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    const msg = message.trim();
    setThread((prev) => [...prev, { role: 'user', content: msg }]);
    setMessage('');
    setLoading(true);
    try {
      const res = await patientApi.aiChat({ message: msg });
      const payload = res.data ?? res;
      setThread(payload.messages || [...thread, { role: 'assistant', content: payload.response }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="responsive-page">
      <div className="responsive-container section-stack">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">AI Chat</h1>
      <div className="responsive-card min-h-[300px] section-stack">
        {thread.length === 0 && <p className="text-sm text-slate-600">Start talking with the wellness AI assistant.</p>}
        {thread.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'assistant' ? 'text-slate-900' : 'text-blue-700'}`}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={message} onChange={(e) => setMessage(e.target.value)} className="flex-1 rounded border p-2" placeholder="How are you feeling today?" />
        <button onClick={send} disabled={loading} className="responsive-action-btn rounded-xl bg-slate-900 text-white">Send</button>
      </div>
      </div>
    </div>
  );
}
