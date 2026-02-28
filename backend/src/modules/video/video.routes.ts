import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { agoraService } from '../../services/agora.service';
import { authenticate } from '../../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../middleware/error.middleware';
import { ERROR_CODES, HTTP_STATUS } from '../../utils/constants';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

/**
 * GET /video/token/:sessionId
 * Generate Agora token for session
 */
router.get('/token/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    // Verify session exists and user is participant
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError('Session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Check authorization
    if (session.patientId !== userId && session.providerId !== userId) {
      throw new AppError('Not authorized', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    // Generate or use existing channel name
    const channelName = session.agoraChannelName || agoraService.generateChannelName(sessionId);

    // Update session with channel name if not set
    if (!session.agoraChannelName) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { agoraChannelName: channelName },
      });
    }

    // Generate token
    const token = agoraService.generateRtcToken({
      channelName,
      userId,
      role: 'publisher',
      expirySeconds: 86400, // 24 hours
    });

    res.json({
      success: true,
      data: {
        token,
        channelName,
        appId: process.env.AGORA_APP_ID,
        uid: userId,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
