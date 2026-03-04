import { useState } from 'react';
import { CHAT_FALLBACK_MESSAGE, chatApi } from '../../api/chat.api';

export default function ClinicalAssistantPage() {
	const [thread, setThread] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
	const [message, setMessage] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [botName, setBotName] = useState('dr meera · Clinical Assistant AI');

	const send = async () => {
		const text = message.trim();
		if (!text || loading) return;

		setThread((prev) => [...prev, { role: 'user', content: text }]);
		setMessage('');
		setLoading(true);
		setError(null);

		try {
			const res = await chatApi.sendMessage({ message: text, bot_type: 'clinical_ai' });
			const payload: any = (res as any)?.data ?? res;
			setBotName(`${payload?.bot_name || 'dr meera'} · Clinical Assistant AI`);
			const messages = Array.isArray(payload?.messages) ? payload.messages : [];
			if (!messages.length) {
				setThread((prev) => [...prev, { role: 'assistant', content: String(payload?.response || CHAT_FALLBACK_MESSAGE) }]);
			} else {
				setThread(messages.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') })));
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to reach clinical assistant');
			setThread((prev) => [
				...prev,
				{
					role: 'assistant',
					content: CHAT_FALLBACK_MESSAGE,
				},
			]);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<h1 className="text-lg font-semibold text-slate-900">{botName}</h1>
				<span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Live</span>
			</div>

			{error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

			<div className="min-h-[320px] space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
				{thread.length === 0 ? (
					<p className="text-sm text-slate-500">Ask about admin workflows, patient insights, or platform operations.</p>
				) : null}
				{thread.map((item, index) => (
					<div
						key={`${item.role}-${index}`}
						className={`flex max-w-[90%] items-start gap-2 rounded-lg px-3 py-2 text-sm ${
							item.role === 'assistant' ? 'bg-white text-slate-800' : 'ml-auto bg-slate-900 text-white'
						}`}
					>
						{item.role === 'assistant' ? (
							<span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">DM</span>
						) : null}
						<span>{item.content}</span>
					</div>
				))}
				{loading ? <p className="text-xs text-slate-500">dr meera is typing…</p> : null}
			</div>

			<div className="mt-3 flex gap-2">
				<input
					value={message}
					onChange={(event) => setMessage(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							void send();
						}
					}}
					placeholder="Ask Dr Meera..."
					className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
				/>
				<button
					onClick={() => void send()}
					disabled={loading}
					className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
				>
					Send
				</button>
			</div>
		</div>
	);
}
