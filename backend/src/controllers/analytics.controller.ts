import type { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { AppError } from '../middleware/error.middleware';

const parseRange = (req: Request) => {
  const from = String(req.query.from || req.body.from || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString());
  const to = String(req.query.to || req.body.to || new Date().toISOString());
  return { from, to };
};

export class AnalyticsController {
  async getSummary(req: Request, res: Response) {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new AppError('Authentication required', 401);
      const range = parseRange(req);
      const data = await analyticsService.getSummary(userId, range);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }

  async getTimeSeries(req: Request, res: Response) {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new AppError('Authentication required', 401);
      const range = parseRange(req);
      const gran = String(req.query.granularity || 'week') as 'day' | 'week' | 'month';
      const data = await analyticsService.getTimeSeries(userId, range, gran);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }

  async getDropOff(req: Request, res: Response) {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new AppError('Authentication required', 401);
      const range = parseRange(req);
      const templateId = req.query.templateId ? String(req.query.templateId) : undefined;
      const data = await analyticsService.getDropOff(userId, range, templateId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }
}

export const analyticsController = new AnalyticsController();
