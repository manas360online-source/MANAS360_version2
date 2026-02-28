import type { Request, Response } from 'express';
import { listTherapistSessions, getTherapistSessionDetail } from '../services/dashboard.service';
import { AppError } from '../middleware/error.middleware';

export class DashboardController {
  async listSessions(req: Request, res: Response) {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new AppError('Authentication required', 401);

      const limit = Number(req.query.limit || 20);
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const from = req.query.from ? String(req.query.from) : undefined;
      const to = req.query.to ? String(req.query.to) : undefined;
      const q = req.query.q ? String(req.query.q) : undefined;

      const out = await listTherapistSessions({ therapistUserId: userId, limit, cursor, status, from, to, q });
      res.json({ success: true, data: out });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  }

  async getSession(req: Request, res: Response) {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new AppError('Authentication required', 401);
      const id = String(req.params.id);
      const detail = await getTherapistSessionDetail(userId, id);
      res.json({ success: true, data: detail });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  }
}

export const dashboardController = new DashboardController();
