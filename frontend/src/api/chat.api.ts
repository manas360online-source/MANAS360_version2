import { http } from '../lib/http';

export const CHAT_FALLBACK_MESSAGE =
	"I'm here to help, but I'm having trouble responding right now. Please try again shortly.";

export type BotType = 'mood_ai' | 'clinical_ai';

export type ChatMessageItem = {
	role: 'user' | 'assistant';
	content: string;
	at?: string;
};

export type ChatMessageResponse = {
	conversation_id: string;
	response: string;
	messages: ChatMessageItem[];
	bot_name: string;
	bot_type: BotType;
	crisis_detected: boolean;
	usage?: {
		tokensUsed: number;
		latencyMs: number;
		model: string;
		fallback: boolean;
	};
};

export const chatApi = {
	sendMessage: async (payload: { message: string; bot_type: BotType }) =>
		(await http.post('/chat/message', payload)).data as { data?: ChatMessageResponse } | ChatMessageResponse,
};
