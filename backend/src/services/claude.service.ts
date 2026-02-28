import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';
import { PrismaClient, CrisisLevel } from '@prisma/client';

const prisma = new PrismaClient();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInput {
  userId: string;
  message: string;
  conversationHistory?: ChatMessage[];
}

interface CrisisDetectionResult {
  isCrisis: boolean;
  crisisLevel: CrisisLevel;
  keywords: string[];
  recommendation: string;
}

export class ClaudeService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.CLAUDE_API_KEY || '',
    });
    this.model = env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
    this.maxTokens = env.CLAUDE_MAX_TOKENS || 4096;
  }

  /**
   * Send chat message and get response
   */
  async chat(input: ChatInput): Promise<{ response: string; crisisDetection: CrisisDetectionResult }> {
    try {
      const { userId, message, conversationHistory = [] } = input;

      // Build conversation with crisis detection system prompt
      const systemPrompt = `You are MANAS360 AI, a compassionate mental wellness assistant. Your role is to:
1. Provide supportive, empathetic responses
2. Encourage professional help when needed
3. NEVER provide medical diagnosis or treatment
4. Detect crisis situations (self-harm, suicide ideation)
5. Use simple, calming language

IMPORTANT: If you detect ANY signs of:
- Suicidal thoughts or ideation
- Self-harm intentions
- Immediate danger to self or others
- Severe mental health crisis

You MUST:
1. Respond with extreme empathy and care
2. Encourage immediate professional help
3. Suggest crisis helplines
4. Flag this as CRISIS in your response by starting with [CRISIS]

For moderate distress, start with [MODERATE].
For normal conversation, start with [NORMAL].`;

      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user',
          content: message,
        },
      ];

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages,
        temperature: 0.7,
      });

      const assistantMessage = response.content[0].text;

      // Detect crisis from response
      const crisisDetection = this.detectCrisis(message, assistantMessage);

      // Save message to database
      await prisma.aIChatMessage.create({
        data: {
          userId,
          role: 'user',
          content: message,
          crisisDetected: crisisDetection.isCrisis,
          crisisLevel: crisisDetection.crisisLevel,
        },
      });

      await prisma.aIChatMessage.create({
        data: {
          userId,
          role: 'assistant',
          content: assistantMessage,
          metadata: {
            model: this.model,
            tokens: response.usage.output_tokens,
          },
        },
      });

      logger.info('Claude chat message processed', {
        userId,
        crisisDetected: crisisDetection.isCrisis,
        crisisLevel: crisisDetection.crisisLevel,
      });

      // Clean response (remove crisis markers)
      const cleanedResponse = assistantMessage
        .replace(/^\[CRISIS\]\s*/i, '')
        .replace(/^\[MODERATE\]\s*/i, '')
        .replace(/^\[NORMAL\]\s*/i, '');

      return {
        response: cleanedResponse,
        crisisDetection,
      };
    } catch (error: any) {
      logger.error('Claude API error', {
        error: error.message,
        userId: input.userId,
      });
      throw new AppError(
        'Failed to process chat message',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Detect crisis from message content
   */
  private detectCrisis(userMessage: string, aiResponse: string): CrisisDetectionResult {
    const messageLower = userMessage.toLowerCase();
    const responseLower = aiResponse.toLowerCase();

    // Crisis keywords
    const severeKeywords = [
      'suicide',
      'kill myself',
      'end my life',
      'want to die',
      'better off dead',
      'no reason to live',
    ];

    const highKeywords = [
      'self harm',
      'hurt myself',
      'cutting',
      'overdose',
      'can\'t go on',
      'hopeless',
    ];

    const moderateKeywords = [
      'depressed',
      'anxious',
      'panic',
      'worthless',
      'alone',
      'scared',
    ];

    const detectedKeywords: string[] = [];

    // Check for severe crisis
    for (const keyword of severeKeywords) {
      if (messageLower.includes(keyword)) {
        detectedKeywords.push(keyword);
      }
    }

    if (detectedKeywords.length > 0 || responseLower.startsWith('[crisis]')) {
      return {
        isCrisis: true,
        crisisLevel: CrisisLevel.SEVERE,
        keywords: detectedKeywords,
        recommendation: 'Immediate intervention required. Contact crisis helpline.',
      };
    }

    // Check for high distress
    for (const keyword of highKeywords) {
      if (messageLower.includes(keyword)) {
        detectedKeywords.push(keyword);
      }
    }

    if (detectedKeywords.length > 0) {
      return {
        isCrisis: true,
        crisisLevel: CrisisLevel.HIGH,
        keywords: detectedKeywords,
        recommendation: 'Urgent professional support needed.',
      };
    }

    // Check for moderate distress
    for (const keyword of moderateKeywords) {
      if (messageLower.includes(keyword)) {
        detectedKeywords.push(keyword);
      }
    }

    if (detectedKeywords.length > 1 || responseLower.startsWith('[moderate]')) {
      return {
        isCrisis: false,
        crisisLevel: CrisisLevel.MODERATE,
        keywords: detectedKeywords,
        recommendation: 'Consider booking session with therapist.',
      };
    }

    return {
      isCrisis: false,
      crisisLevel: CrisisLevel.NONE,
      keywords: [],
      recommendation: 'Continue wellness journey.',
    };
  }

  /**
   * Get conversation history for user
   */
  async getConversationHistory(userId: string, limit: number = 10): Promise<ChatMessage[]> {
    const messages = await prisma.aIChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages
      .reverse()
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
  }
}

export const claudeService = new ClaudeService();
