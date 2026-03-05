import { prisma } from '../config/db';

const db = prisma as any;

export type CrisisUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ChatCrisisAnalysisResult = {
	sentiment_score: number;
	crisis_risk: number;
	crisis_intent: boolean;
	urgency_level: CrisisUrgency;
	detected_themes: string[];
	reasoning: string;
	recommended_action: string;
	fallback_used: boolean;
	error?: string;
};

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const SONNET_MODEL = process.env.CLAUDE_SONNET_MODEL || 'claude-3-5-sonnet-20241022';

const keywordMap: Array<{ token: string; weight: number; theme: string }> = [
	{ token: 'kill myself', weight: 0.95, theme: 'suicidal_ideation' },
	{ token: 'end my life', weight: 0.95, theme: 'suicidal_ideation' },
	{ token: 'suicide', weight: 0.9, theme: 'suicidal_ideation' },
	{ token: 'self harm', weight: 0.85, theme: 'self_harm' },
	{ token: 'want to die', weight: 0.95, theme: 'suicidal_ideation' },
	{ token: 'hurt myself', weight: 0.9, theme: 'self_harm' },
	{ token: 'marna chahta', weight: 0.95, theme: 'suicidal_ideation_hi' },
	{ token: 'zindagi khatam', weight: 0.9, theme: 'hopelessness_hi' },
	{ token: 'jeena nahi', weight: 0.92, theme: 'suicidal_ideation_hi' },
	{ token: 'aatmahatya', weight: 0.96, theme: 'suicide_hi' },
	{ token: 'hopeless', weight: 0.65, theme: 'hopelessness' },
	{ token: 'i am done', weight: 0.75, theme: 'despair' },
];

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

const parseClaudeJson = (raw: string): Partial<ChatCrisisAnalysisResult> | null => {
	const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
	try {
		return JSON.parse(cleaned);
	} catch {
		const start = cleaned.indexOf('{');
		const end = cleaned.lastIndexOf('}');
		if (start >= 0 && end > start) {
			try {
				return JSON.parse(cleaned.slice(start, end + 1));
			} catch {
				return null;
			}
		}
		return null;
	}
};

const fallbackAnalyze = (message: string, apiFailed: boolean): ChatCrisisAnalysisResult => {
	const normalized = String(message || '').toLowerCase();
	const hits = keywordMap.filter((item) => normalized.includes(item.token));
	const strongest = hits.reduce((max, item) => Math.max(max, item.weight), 0);
	const crisisIntent = strongest >= 0.9;
	let urgency: CrisisUrgency = 'LOW';
	if (crisisIntent) urgency = 'CRITICAL';
	else if (strongest >= 0.75) urgency = 'HIGH';
	else if (strongest >= 0.4) urgency = 'MEDIUM';
	else if (apiFailed) urgency = 'MEDIUM';

	const crisisRisk = strongest > 0 ? strongest : apiFailed ? 0.45 : 0.1;

	return {
		sentiment_score: clamp(1 - crisisRisk),
		crisis_risk: clamp(crisisRisk),
		crisis_intent: crisisIntent,
		urgency_level: urgency,
		detected_themes: [...new Set(hits.map((item) => item.theme))],
		reasoning: hits.length ? 'Keyword-based fallback detection triggered.' : 'Claude unavailable, elevated precaution fallback applied.',
		recommended_action: urgency === 'CRITICAL' || urgency === 'HIGH' ? 'Escalate to crisis workflow immediately.' : 'Monitor and continue supportive response.',
		fallback_used: true,
	};
};

export const analyzeChatCrisis = async (message: string): Promise<ChatCrisisAnalysisResult> => {
	const apiKey = process.env.CLAUDE_API_KEY;
	if (!apiKey) {
		return { ...fallbackAnalyze(message, true), error: 'CLAUDE_API_KEY not configured' };
	}

	const abortController = new AbortController();
	const timeout = setTimeout(() => abortController.abort(), 2800);
	try {
		const prompt = `You are a clinical safety triage analyzer for MANAS360. Analyze this message in English/Hindi/Hinglish. Return ONLY JSON with fields: sentiment_score, crisis_risk, crisis_intent, urgency_level, detected_themes, reasoning, recommended_action. urgency_level must be one of LOW, MEDIUM, HIGH, CRITICAL. Message: ${message}`;

		const response = await fetch(CLAUDE_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: SONNET_MODEL,
				max_tokens: 400,
				temperature: 0,
				messages: [{ role: 'user', content: prompt }],
			}),
			signal: abortController.signal,
		});

		if (!response.ok) {
			const fallback = fallbackAnalyze(message, true);
			return { ...fallback, error: `Claude API ${response.status}` };
		}

		const body = (await response.json()) as any;
		const text = Array.isArray(body?.content)
			? body.content.map((part: any) => (part?.type === 'text' ? String(part?.text || '') : '')).join('').trim()
			: '';
		const parsed = parseClaudeJson(text);
		if (!parsed) {
			const fallback = fallbackAnalyze(message, true);
			return { ...fallback, error: 'Claude JSON parse failed' };
		}

		const urgencyRaw = String(parsed.urgency_level || '').toUpperCase();
		const urgency: CrisisUrgency = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(urgencyRaw)
			? (urgencyRaw as CrisisUrgency)
			: 'MEDIUM';

		return {
			sentiment_score: clamp(Number(parsed.sentiment_score ?? 0.5)),
			crisis_risk: clamp(Number(parsed.crisis_risk ?? 0.5)),
			crisis_intent: Boolean(parsed.crisis_intent),
			urgency_level: urgency,
			detected_themes: Array.isArray(parsed.detected_themes) ? parsed.detected_themes.map((item) => String(item)) : [],
			reasoning: String(parsed.reasoning || 'Claude crisis analysis completed.'),
			recommended_action: String(parsed.recommended_action || 'Continue safety monitoring.'),
			fallback_used: false,
		};
	} catch (error) {
		const fallback = fallbackAnalyze(message, true);
		return { ...fallback, error: String(error) };
	} finally {
		clearTimeout(timeout);
	}
};

export const persistChatAnalysis = async (input: {
	userId: string;
	botType: 'mood_ai' | 'clinical_ai';
	message: string;
	analysis: ChatCrisisAnalysisResult;
}): Promise<void> => {
	try {
		await db.chatAnalysis.create({
			data: {
				userId: input.userId,
				botType: input.botType,
				messageContent: input.message,
				sentimentScore: input.analysis.sentiment_score,
				crisisRisk: input.analysis.crisis_risk,
				crisisIntent: input.analysis.crisis_intent,
				urgencyLevel: input.analysis.urgency_level,
				detectedThemes: input.analysis.detected_themes,
				fallbackUsed: input.analysis.fallback_used,
				analysisJson: input.analysis,
			},
		});
	} catch (error) {
		console.error('[chat] persist_chat_analysis_failed', { userId: input.userId, error: String(error) });
	}
};
