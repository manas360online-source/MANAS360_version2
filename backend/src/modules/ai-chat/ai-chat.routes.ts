import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { claudeService } from '../../services/claude.service';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { userRateLimit } from '../../middleware/rateLimit.middleware';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(requireRole('PATIENT'));

const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(2000),
  }),
});

/**
 * POST /ai-chat
 * Send message to AI assistant
 */
router.post(
  '/',
  userRateLimit(20, 60000), // 20 messages per minute
  validateRequest(chatSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { message } = req.body;

      // Get conversation history
      const history = await claudeService.getConversationHistory(userId, 10);

      // Send message to Claude
      const result = await claudeService.chat({
        userId,
        message,
        conversationHistory: history,
      });

      res.json({
        success: true,
        data: {
          message: result.response,
          crisisDetected: result.crisisDetection.isCrisis,
          crisisLevel: result.crisisDetection.crisisLevel,
          recommendation: result.crisisDetection.recommendation,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /ai-chat/history
 * Get conversation history
 */
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await prisma.aIChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
