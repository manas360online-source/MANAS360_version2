import { Worker, Queue } from 'bullmq';
import { sessionExportService } from '../services/session-export.service';
import { createClient } from 'redis';
import { env } from '../config/env';
import { prisma } from '../config/db';

const REDIS_URL = process.env.REDIS_URL || env.redisUrl || 'redis://127.0.0.1:6379';

export const exportQueue = new Queue('session-exports', { connection: { url: REDIS_URL } });

// Worker to process export jobs
export const exportWorker = new Worker(
  'session-exports',
  async (job: any) => {
    const { sessionId, format, requestorId, uploadToS3 } = job.data as any;
    // Attempt to find existing export record by jobId (created at enqueue time)
    const jobId = String(job.id);
    let exportRecord = await prisma.sessionExport.findUnique({ where: { jobId } });
    try {
      // mark processing if record exists
      if (exportRecord) {
        await prisma.sessionExport.update({ where: { id: exportRecord.id }, data: { status: 'PROCESSING' } });
      }

      let res: any;
      if (format === 'pdf') {
        res = await sessionExportService.exportToPDF(sessionId, { uploadToS3, requestorId });
      } else if (format === 'csv') {
        res = await sessionExportService.exportToCSV(sessionId, { uploadToS3, requestorId });
      } else if (format === 'json') {
        res = await sessionExportService.exportToJSON(sessionId, { uploadToS3, requestorId });
      } else {
        throw new Error('Unsupported format');
      }

      if (exportRecord) {
        await prisma.sessionExport.update({ where: { id: exportRecord.id }, data: { status: 'COMPLETED', resultUrl: res.s3Url ?? null, filePath: res.s3Url ?? res.filePath ?? '', fileName: res.s3Url ? res.s3Url.split('/').pop() ?? '' : res.filePath ?? '' } });
      } else {
        await prisma.sessionExport.create({ data: { sessionId, jobId, format: (format || 'UNKNOWN').toUpperCase(), fileName: res.s3Url ? res.s3Url.split('/').pop() ?? '' : res.filePath ?? '', filePath: res.s3Url ?? res.filePath ?? '', status: 'COMPLETED' } });
      }

      return { ok: true, result: res };
    } catch (err) {
      if (exportRecord) {
        await prisma.sessionExport.update({ where: { id: exportRecord.id }, data: { status: 'FAILED', errorMessage: String(err) } });
      } else {
        await prisma.sessionExport.create({ data: { sessionId, jobId, format: (format || 'UNKNOWN').toUpperCase(), fileName: '', filePath: '', status: 'FAILED', errorMessage: String(err) } });
      }
      throw err;
    }
  },
  { connection: { url: REDIS_URL }, concurrency: 2 }
);

exportWorker.on('failed', (job: any, err: any) => {
  console.error('[exportWorker] job failed', job.id, err);
});
