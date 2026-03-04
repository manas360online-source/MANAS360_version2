type SupportedRole = 'patient' | 'provider' | 'admin';

type ChatMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

type GenerateAiResponseInput = {
	role: SupportedRole;
	messages: ChatMessage[];
	maxTokens?: number;
};

type GenerateAiResponseOptions = {
	maxTokens?: number;
};

type GenerateAiResponseResult = {
	text: string;
	tokensUsed: number;
	latencyMs: number;
	model: string;
	fallback: boolean;
	error?: string;
};

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-3-haiku';
const DEFAULT_MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS || 512);
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_CONTEXT_MESSAGES = 10;
const MAX_ALLOWED_TOKENS = 1024;

const fallbackMessage =
	"I'm here to help, but I'm having trouble responding right now. Please try again shortly.";

export const generateAIResponse = async (
	inputOrRole: GenerateAiResponseInput | SupportedRole,
	messagesArg?: ChatMessage[],
	options?: GenerateAiResponseOptions,
): Promise<GenerateAiResponseResult> => {
	const input: GenerateAiResponseInput =
		typeof inputOrRole === 'string'
			? {
					role: inputOrRole,
					messages: Array.isArray(messagesArg) ? messagesArg : [],
					maxTokens: options?.maxTokens,
			  }
			: inputOrRole;

	const startedAt = Date.now();
	const apiKey = process.env.CLAUDE_API_KEY;
	const model = DEFAULT_MODEL;

	const sanitizedMessages = input.messages
		.filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
		.map((m) => ({ role: m.role, content: m.content.trim() }));

	if (!apiKey) {
		return {
			text: fallbackMessage,
			tokensUsed: 0,
			latencyMs: Date.now() - startedAt,
			model,
			fallback: true,
			error: 'CLAUDE_API_KEY not configured',
		};
	}

	const systemPrompt =
		sanitizedMessages.find((m) => m.role === 'system')?.content ||
		'You are an assistant for MANAS360. Keep responses safe and concise.';

	const conversation = sanitizedMessages
		.filter((m) => m.role !== 'system')
		.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

	const cappedConversation = conversation.slice(-MAX_CONTEXT_MESSAGES);
	const requestedMaxTokens = Number(input.maxTokens || DEFAULT_MAX_TOKENS);
	const maxTokens = Number.isFinite(requestedMaxTokens)
		? Math.min(Math.max(requestedMaxTokens, 64), MAX_ALLOWED_TOKENS)
		: DEFAULT_MAX_TOKENS;

	const timeoutMs = 2800;
	const abortController = new AbortController();
	const timeout = setTimeout(() => abortController.abort(), timeoutMs);

	try {
		const response = await fetch(ANTHROPIC_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model,
				max_tokens: maxTokens,
				system: systemPrompt,
				messages: cappedConversation,
				temperature: input.role === 'patient' ? 0.5 : 0.3,
			}),
			signal: abortController.signal,
		});

		if (!response.ok) {
			const responseText = await response.text().catch(() => '');
			return {
				text: fallbackMessage,
				tokensUsed: 0,
				latencyMs: Date.now() - startedAt,
				model,
				fallback: true,
				error: `Claude API error ${response.status}: ${responseText.slice(0, 300)}`,
			};
		}

		const body = (await response.json()) as any;
		const text = Array.isArray(body?.content)
			? body.content
					.map((part: any) => (part?.type === 'text' ? String(part?.text || '') : ''))
					.join('')
					.trim()
			: '';

		const usage = body?.usage || {};
		const tokensUsed = Number(usage?.input_tokens || 0) + Number(usage?.output_tokens || 0);

		return {
			text: text || fallbackMessage,
			tokensUsed,
			latencyMs: Date.now() - startedAt,
			model,
			fallback: text.length === 0,
		};
	} catch (error) {
		console.error('[chat] ai_call_failed', {
			model,
			latencyMs: Date.now() - startedAt,
			error: String(error),
		});
		return {
			text: fallbackMessage,
			tokensUsed: 0,
			latencyMs: Date.now() - startedAt,
			model,
			fallback: true,
			error: String(error),
		};
	} finally {
		clearTimeout(timeout);
	}
};
