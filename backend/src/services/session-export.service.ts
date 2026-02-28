import { prisma } from '../config/db';
import * as PDFDocument from 'pdfkit';
import { createWriteStream, readFileSync } from 'fs';
import { join } from 'path';
import * as csv from 'fast-csv';
import { s3Client } from './s3.service';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

export class SessionExportService {
  /**
   * Export session to PDF
   */
  async exportToPDF(
    sessionId: string,
    options?: { outputPath?: string; uploadToS3?: boolean; includeDecryptedNotes?: boolean; requestorId?: string }
  ): Promise<{ filePath?: string; s3Url?: string }> {
    const session = await prisma.patientSession.findUnique({
      where: { id: sessionId },
      include: {
        template: {
          include: {
            questions: { orderBy: { orderIndex: 'asc' } },
          },
        },
        patient: {
          select: { firstName: true, lastName: true, email: true },
        },
        responses: {
          include: { question: true },
          orderBy: { answeredAt: 'asc' },
        },
      },
    });

    if (!session) throw new Error('Session not found');

    // Prevent exporting incomplete sessions
    if (!session.completedAt) {
      throw new Error('Cannot export session before it is completed');
    }

    // Resolve requestor (therapist) name for metadata if provided
    let requestorName = '';
    if (options?.requestorId) {
      try {
        const user = await prisma.user.findUnique({ where: { id: options.requestorId }, select: { firstName: true, lastName: true } });
        if (user) requestorName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      } catch (e) {
        // ignore lookup failures
      }
    }

    const doc = new PDFDocument({ margin: 50 });
    const fileName = `session-${sessionId}-${Date.now()}.pdf`;
    const filePath = options?.outputPath || join(process.cwd(), 'exports', fileName);

    doc.pipe(createWriteStream(filePath));

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('CBT Session Report', { align: 'center' });
    doc.fontSize(10).fillColor('#666').text('Confidential - For Clinical Use Only', { align: 'center' });
    doc.moveDown(0.5);
    // Metadata: therapist, patient, date, version
    doc.fontSize(10).fillColor('#333').font('Helvetica').text(`Therapist: ${requestorName || '—'}`);
    doc.text(`Patient: ${session.patient.firstName} ${session.patient.lastName}`);
    doc.text(`Session Date: ${session.completedAt?.toLocaleString()}`);
    doc.text(`Template Version: ${session.templateVersion}`);
    doc.moveDown();

    // Patient Info
    doc.fontSize(12).fillColor('#000').font('Helvetica-Bold').text('Patient Information');
    doc.fontSize(10).font('Helvetica').text(`Name: ${session.patient.firstName} ${session.patient.lastName}`);
    doc.text(`Email: ${session.patient.email}`);
    doc.text(`Session ID: ${session.id}`);
    doc.text(`Started: ${session.startedAt?.toLocaleString() || 'Not started'}`);
    doc.text(`Completed: ${session.completedAt?.toLocaleString() || 'In progress'}`);
    doc.text(`Status: ${session.status}`);
    doc.moveDown();

    // Session Template Info
    doc.fontSize(12).font('Helvetica-Bold').text('Session Template');
    doc.fontSize(10).font('Helvetica').text(`Title: ${session.template.title}`);
    doc.text(`Version: ${session.templateVersion}`);
    if (session.template.description) {
      doc.text(`Description: ${session.template.description}`);
    }
    doc.moveDown();

    // Responses
    doc.fontSize(12).font('Helvetica-Bold').text('Responses');
    doc.moveDown(0.5);

    session.responses.forEach((response: any, index: number) => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0052CC').text(`Q${index + 1}: ${response.question.prompt}`);
      
      doc.fontSize(10).fillColor('#000').font('Helvetica');
      doc.text(`Type: ${response.question.type}`);
      
      // Format response based on type
      const sanitized = this.sanitizeResponseData(response.responseData);
      const formattedResponse = this.formatResponseForPDF(sanitized, response.question.type);
      doc.text(`Answer: ${formattedResponse}`);
      
      if (response.timeSpentSeconds) {
        doc.text(`Time Spent: ${Math.round(response.timeSpentSeconds / 60)} minutes`);
      }
      doc.text(`Answered: ${response.answeredAt.toLocaleString()}`);
      
      doc.moveDown(0.5);
    });

    // Summary Statistics
    doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('Summary Statistics');
    doc.fontSize(10).font('Helvetica').text(`Total Questions: ${session.template.questions.length}`);
    doc.text(`Questions Answered: ${session.responses.length}`);
    doc.text(`Completion Rate: ${((session.responses.length / session.template.questions.length) * 100).toFixed(1)}%`);
    
    const totalTime = session.responses.reduce((sum: number, r: any) => sum + (r.timeSpentSeconds || 0), 0);
    doc.text(`Total Time: ${Math.round(totalTime / 60)} minutes`);

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();

    // End document first
    doc.end();

    // Optionally upload to S3 and return presigned URL
    if (options?.uploadToS3) {
      const buffer = readFileSync(filePath);
      const objectKey = `exports/sessions/${sessionId}/${fileName}`;
      await s3Client.send(
        new PutObjectCommand({ Bucket: env.awsS3Bucket, Key: objectKey, Body: buffer, ContentType: 'application/pdf', ServerSideEncryption: 'AES256' })
      );

      const s3Url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: env.awsS3Bucket, Key: objectKey }), { expiresIn: Number(env.exportSignedUrlTtlSeconds || 3600) });

      await prisma.sessionExport.create({ data: { sessionId, format: 'PDF', fileName, filePath: objectKey, status: 'COMPLETED', expiresAt: new Date(Date.now() + (Number(env.exportSignedUrlTtlSeconds || 3600) * 1000)) } });

      // Audit log
      if (options?.requestorId) {
        await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId, action: 'EXPORTED', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { format: 'PDF', via: 'S3' } } });
      }

      return { s3Url };
    }

    await prisma.sessionExport.create({ data: { sessionId, format: 'PDF', fileName, filePath, status: 'COMPLETED' } });
    if (options?.requestorId) {
      await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId, action: 'EXPORTED', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { format: 'PDF', via: 'LOCAL' } } });
    }

    return { filePath };
  }

  /**
   * Export session to CSV
   */
  async exportToCSV(
    sessionId: string,
    options?: { outputPath?: string; uploadToS3?: boolean; includeDecryptedNotes?: boolean; requestorId?: string }
  ): Promise<{ filePath?: string; s3Url?: string }> {
    const session = await prisma.patientSession.findUnique({
      where: { id: sessionId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, email: true },
        },
        template: true,
        responses: {
          include: { question: true },
          orderBy: { answeredAt: 'asc' },
        },
      },
    });

    if (!session) throw new Error('Session not found');

    // Prevent exporting incomplete sessions
    if (!session.completedAt) {
      throw new Error('Cannot export session before it is completed');
    }

    // Resolve requestor (therapist) name for metadata if provided
    let requestorName = '';
    if (options?.requestorId) {
      try {
        const user = await prisma.user.findUnique({ where: { id: options.requestorId }, select: { firstName: true, lastName: true } });
        if (user) requestorName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      } catch (e) {
        // ignore lookup failures
      }
    }

    const fileName = `session-${sessionId}-${Date.now()}.csv`;
    const filePath = options?.outputPath || join(process.cwd(), 'exports', fileName);

    const ws = createWriteStream(filePath);

    // Header rows / metadata
    const headers = [
      'Patient Name',
      'Patient Email',
      'Session ID',
      'Template Title',
      'Template Version',
      'Question Index',
      'Question Type',
      'Question Prompt',
      'Answer',
      'Time Spent (seconds)',
      'Answered At',
      'Session Status',
    ];

    const rows = session.responses.map((response: any, index: number) => [
      `${session.patient.firstName} ${session.patient.lastName}`,
      session.patient.email,
      session.id,
      session.template.title,
      session.templateVersion.toString(),
      (index + 1).toString(),
      response.question.type,
      response.question.prompt,
      this.formatResponseForCSV(this.sanitizeResponseData(response.responseData), response.question.type),
      response.timeSpentSeconds?.toString() || '',
      response.answeredAt.toISOString(),
      session.status,
    ]);

    const csvWriter = csv.format({ headers: false });
    csvWriter.pipe(ws);

    // Write metadata rows first
    csvWriter.write(['Exported By', requestorName || '']);
    csvWriter.write(['Patient Name', `${session.patient.firstName} ${session.patient.lastName}`]);
    csvWriter.write(['Patient Email', session.patient.email]);
    csvWriter.write(['Session ID', session.id]);
    csvWriter.write(['Template Version', session.templateVersion?.toString() || '']);
    csvWriter.write(['Exported At', new Date().toISOString()]);
    csvWriter.write([]);

    // Write header row
    csvWriter.write(headers);
    rows.forEach((row: any) => csvWriter.write(row));
    csvWriter.end();

    // Create export log and optionally upload
    return new Promise((resolve, reject) => {
      ws.on('finish', async () => {
        if (options?.uploadToS3) {
          try {
            const buffer = readFileSync(filePath);
            const objectKey = `exports/sessions/${sessionId}/${fileName}`;
            await s3Client.send(new PutObjectCommand({ Bucket: env.awsS3Bucket, Key: objectKey, Body: buffer, ContentType: 'text/csv', ServerSideEncryption: 'AES256' }));
            const s3Url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: env.awsS3Bucket, Key: objectKey }), { expiresIn: Number(env.exportSignedUrlTtlSeconds || 3600) });
            await prisma.sessionExport.create({ data: { sessionId, format: 'CSV', fileName, filePath: objectKey, status: 'COMPLETED', expiresAt: new Date(Date.now() + (Number(env.exportSignedUrlTtlSeconds || 3600) * 1000)) } });
            if (options?.requestorId) await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId, action: 'EXPORTED', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { format: 'CSV', via: 'S3' } } });
            resolve({ s3Url });
          } catch (e) { reject(e); }
        } else {
          await prisma.sessionExport.create({ data: { sessionId, format: 'CSV', fileName, filePath, status: 'COMPLETED' } });
          if (options?.requestorId) await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId, action: 'EXPORTED', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { format: 'CSV', via: 'LOCAL' } } });
          resolve({ filePath });
        }
      });

      ws.on('error', reject);
    });
  }

  /**
   * Export session to JSON
   */
  async exportToJSON(
    sessionId: string,
    options?: { outputPath?: string; uploadToS3?: boolean; includeDecryptedNotes?: boolean; requestorId?: string }
  ): Promise<{ filePath?: string; s3Url?: string }> {
    const session = await prisma.patientSession.findUnique({
      where: { id: sessionId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        template: {
          include: {
            questions: { orderBy: { orderIndex: 'asc' } },
          },
        },
        responses: {
          include: { question: true },
          orderBy: { answeredAt: 'asc' },
        },
      },
    });

    if (!session) throw new Error('Session not found');

    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: 1,
      },
      session: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        templateVersion: session.templateVersion,
      },
      patient: {
        id: session.patient.id,
        firstName: session.patient.firstName,
        lastName: session.patient.lastName,
        email: session.patient.email,
      },
      template: {
        id: session.template.id,
        title: session.template.title,
        description: session.template.description,
        version: session.templateVersion,
        totalQuestions: session.template.questions.length,
      },
      responses: session.responses.map((r: any) => ({
        questionId: r.question.id,
        questionIndex: r.question.orderIndex,
        questionType: r.question.type,
        questionPrompt: r.question.prompt,
        responseData: this.sanitizeResponseData(r.responseData),
        timeSpentSeconds: r.timeSpentSeconds,
        answeredAt: r.answeredAt,
      })),
      statistics: {
        totalQuestionsAnswered: session.responses.length,
        totalQuestionsInTemplate: session.template.questions.length,
        completionPercentage:
          ((session.responses.length / session.template.questions.length) * 100).toFixed(2),
        totalTimeSpentSeconds: session.responses.reduce(
            (sum: number, r: any) => sum + (r.timeSpentSeconds || 0),
            0
          ),
      },
    };

    const fileName = `session-${sessionId}-${Date.now()}.json`;
    const filePath = options?.outputPath || join(process.cwd(), 'exports', fileName);

    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));

    if (options?.uploadToS3) {
      const buffer = readFileSync(filePath);
      const objectKey = `exports/sessions/${sessionId}/${fileName}`;
      await s3Client.send(new PutObjectCommand({ Bucket: env.awsS3Bucket, Key: objectKey, Body: buffer, ContentType: 'application/json', ServerSideEncryption: 'AES256' }));
      const s3Url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: env.awsS3Bucket, Key: objectKey }), { expiresIn: Number(env.exportSignedUrlTtlSeconds || 3600) });
      await prisma.sessionExport.create({ data: { sessionId, format: 'JSON', fileName, filePath: objectKey, status: 'COMPLETED', expiresAt: new Date(Date.now() + (Number(env.exportSignedUrlTtlSeconds || 3600) * 1000)) } });
      if (options?.requestorId) await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId, action: 'EXPORTED', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { format: 'JSON', via: 'S3' } } });
      return { s3Url };
    }

    await prisma.sessionExport.create({ data: { sessionId, format: 'JSON', fileName, filePath, status: 'COMPLETED' } });
    if (options?.requestorId) await prisma.sessionAuditLog.create({ data: { sessionId, userId: options.requestorId, action: 'EXPORTED', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { format: 'JSON', via: 'LOCAL' } } });
    return { filePath };
  }

  /**
   * Remove or redact sensitive fields from responseData (e.g. encrypted blobs)
   */
  private sanitizeResponseData(data: any): any {
    if (data == null) return data;
    // deep clone simple JSON-safe object
    let copy: any;
    try {
      copy = JSON.parse(JSON.stringify(data));
    } catch (e) {
      return '[UNSERIALIZABLE]';
    }

    const redactKeys = ['encryptedContent', 'iv', 'authTag', 'auth_tag', 'encrypted', 'sessionNotes', 'notes_provider', 'notes_patient'];

    function walk(obj: any): any {
      if (obj == null) return obj;
      if (Array.isArray(obj)) return obj.map(walk);
      if (typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          const lower = k.toLowerCase();
          if (redactKeys.some(r => lower.includes(r))) {
            obj[k] = '[REDACTED]';
            continue;
          }
          if (typeof obj[k] === 'object') {
            // If this object looks like an EncryptedPayload and includeDecryptedNotes is enabled
            obj[k] = walk(obj[k]);
          }
        }
      }
      return obj;
    }

    return walk(copy);
  }

  /**
   * Get session export history
   */
  async getExportHistory(sessionId: string) {
    return prisma.sessionExport.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Format response data for PDF display
   */
  private formatResponseForPDF(responseData: any, questionType: string): string {
    switch (questionType) {
      case 'MULTIPLE_CHOICE':
        return responseData.selectedOptionId || 'Not answered';
      case 'TEXT':
        return responseData.text || 'No response';
      case 'SLIDER':
        return `${responseData.value} (out of ${responseData.max || 10})`;
      case 'CHECKBOX':
        return Array.isArray(responseData.selectedOptions)
          ? responseData.selectedOptions.join(', ')
          : 'No options selected';
      default:
        return JSON.stringify(responseData);
    }
  }

  /**
   * Format response data for CSV export
   */
  private formatResponseForCSV(responseData: any, questionType: string): string {
    const formatted = this.formatResponseForPDF(responseData, questionType);
    // Escape quotes for CSV
    return `"${formatted.replace(/"/g, '""')}"`;
  }
}

// Export a helper for tests to use the same sanitization logic
export function sanitizeResponseData(data: any): any {
  const svc = new SessionExportService();
  return (svc as any).sanitizeResponseData(data);
}

export const sessionExportService = new SessionExportService();
