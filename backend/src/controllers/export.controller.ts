import { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import { exportQueue } from '../jobs/export.worker';
import { prisma } from '../config/db';

const getAuthUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }
  return userId;
};

export const getExportStatusController = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthUserId(req);
  const jobId = String(req.params.jobId);

  try {
    // Primary lookup: find sessionExport by jobId to ensure job -> export mapping and ownership
    const exportRecord = await prisma.sessionExport.findUnique({ where: { jobId } });
    if (!exportRecord) {
      // fallback: check job minimal info but do not return internal job payload
      const job = await exportQueue.getJob(jobId as any);
      if (!job) {
        res.status(404).json({ success: false, error: 'Job not found' });
        return;
      }
      const jobData: any = job.data || {};
      if (jobData.requestorId && jobData.requestorId !== userId) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }
      const state = await job.getState();
      res.json({ success: true, job: { id: job.id, state, progress: job.progress }, export: null });
      return;
    }

    // ownership check: ensure the therapist requesting the status owns the export
    // sessionExport is tied to a session; verify session ownership via therapist id on session if necessary
    const session = await prisma.patientSession.findUnique({ where: { id: exportRecord.sessionId } });
    if (session && session.therapistId && session.therapistId !== userId) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    res.json({ success: true, job: { id: exportRecord.jobId }, export: exportRecord });
    return;
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
    return;
  }
};

export default { getExportStatusController };
