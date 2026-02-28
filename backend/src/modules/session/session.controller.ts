import { Request, Response, NextFunction } from 'express';
import { SessionService } from './session.service';
import { HTTP_STATUS } from '../../utils/constants';
import { logger } from '../../utils/logger';

const sessionService = new SessionService();

export class SessionController {
  /**
   * Create new session
   */
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerId, scheduledAt, duration } = req.body;
      const patientId = req.user!.id;

      const result = await sessionService.createSession({
        patientId,
        providerId,
        scheduledAt: new Date(scheduledAt),
        duration,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete session
   */
  async completeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { sessionNotes } = req.body;
      const providerId = req.user!.id;

      const session = await sessionService.completeSession(id, providerId, sessionNotes);

      res.json({
        success: true,
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start session
   */
  async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const session = await sessionService.startSession(id, userId);

      res.json({
        success: true,
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get session
   */
  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const session = await sessionService.getSession(id, userId);

      res.json({
        success: true,
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's sessions
   */
  async getUserSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const sessions = await sessionService.getUserSessions(userId, userRole);

      res.json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark no-show
   */
  async markNoShow(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const session = await sessionService.markNoShow(id, userId);

      res.json({
        success: true,
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  }
}
