import { Request, Response } from 'express';
import { sessionExportService } from '../services/session-export.service';
import { prisma } from '../config/db';

async function ensureAuthorized(req: Request, sessionId: string, requireDecryptedAccess = false) {
  const authUserId = req.auth?.userId;
  if (!authUserId) throw new Error('Authentication required');

  const session = await prisma.patientSession.findUnique({
    where: { id: sessionId },
    include: { template: { select: { therapistId: true } }, patient: { select: { id: true } } },
  });
  if (!session) throw new Error('Session not found');

  // Allow patient who owns the session, the therapist who created the template, or admin users
  if (session.patient.id === authUserId) {
    // Patients may not be allowed decrypted notes access
    if (requireDecryptedAccess) throw new Error('Forbidden');
    return;
  }

  if (session.template.therapistId === authUserId) {
    // Therapist (owner) allowed; OK for decrypted if requested
    return;
  }

  // Check admin role as fallback
  const user = await prisma.user.findUnique({ where: { id: authUserId }, select: { role: true } });
  if (user?.role === 'ADMIN') return;

  throw new Error('Forbidden');
}

export class SessionExportController {
  /**
   * POST /api/cbt-sessions/:id/export/pdf
   * Export session to PDF
   */
  async exportToPDF(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { includeDecryptedNotes, uploadToS3 } = req.body || {};
      await ensureAuthorized(req, id, !!includeDecryptedNotes);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="session-${id}.pdf"`);

      const result = await sessionExportService.exportToPDF(id, { uploadToS3: !!uploadToS3, includeDecryptedNotes: !!includeDecryptedNotes, requestorId: req.auth?.userId });

      // If S3 upload was requested, return presigned URL; otherwise stream local file
      if (result.s3Url) {
        res.json({ success: true, url: result.s3Url });
        return;
      }

      const fs = require('fs');
      const stream = fs.createReadStream(result.filePath);
      stream.on('error', (err: any) => {
        res.status(500).json({ success: false, error: err.message });
      });
      stream.pipe(res);
    } catch (error) {
      res.status(403).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/cbt-sessions/:id/export/csv
   * Export session to CSV
   */
  async exportToCSV(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { includeDecryptedNotes, uploadToS3 } = req.body || {};
      await ensureAuthorized(req, id, !!includeDecryptedNotes);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="session-${id}.csv"`);

      const result = await sessionExportService.exportToCSV(id, { uploadToS3: !!uploadToS3, includeDecryptedNotes: !!includeDecryptedNotes, requestorId: req.auth?.userId });

      if (result.s3Url) {
        res.json({ success: true, url: result.s3Url });
        return;
      }

      const fs = require('fs');
      const stream = fs.createReadStream(result.filePath);
      stream.on('error', (err: any) => {
        res.status(500).json({ success: false, error: err.message });
      });
      stream.pipe(res);
    } catch (error) {
      res.status(403).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/cbt-sessions/:id/export/json
   * Export session to JSON
   */
  async exportToJSON(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { includeDecryptedNotes, uploadToS3 } = req.body || {};
      await ensureAuthorized(req, id, !!includeDecryptedNotes);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="session-${id}.json"`);

      const result = await sessionExportService.exportToJSON(id, { uploadToS3: !!uploadToS3, includeDecryptedNotes: !!includeDecryptedNotes, requestorId: req.auth?.userId });

      if (result.s3Url) {
        res.json({ success: true, url: result.s3Url });
        return;
      }

      const fs = require('fs');
      const stream = fs.createReadStream(result.filePath);
      stream.on('error', (err: any) => {
        res.status(500).json({ success: false, error: err.message });
      });
      stream.pipe(res);
    } catch (error) {
      res.status(403).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/cbt-sessions/:id/exports
   * Get export history
   */
  async getExportHistory(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const exports = await sessionExportService.getExportHistory(id);

      res.json({
        success: true,
        data: exports,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
}

export const sessionExportController = new SessionExportController();
