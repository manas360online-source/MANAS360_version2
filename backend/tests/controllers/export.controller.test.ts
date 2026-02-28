import { getExportStatusController } from '../../../backend/src/controllers/export.controller';
import httpMocks from 'node-mocks-http';

jest.mock('../../../backend/src/jobs/export.worker', () => ({
  exportQueue: {
    getJob: jest.fn(),
  },
}));

jest.mock('../../../backend/src/config/db', () => ({
  prisma: {
    sessionExport: {
      findUnique: jest.fn(),
    },
    patientSession: {
      findUnique: jest.fn(),
    },
  },
}));

const { exportQueue } = require('../../../backend/src/jobs/export.worker');
const { prisma } = require('../../../backend/src/config/db');

describe('getExportStatusController', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns export record when jobId matches and therapist owns session', async () => {
    const req: any = httpMocks.createRequest({ params: { jobId: 'job-123' }, auth: { userId: 'therapist-1' } });
    const res: any = httpMocks.createResponse();

    prisma.sessionExport.findUnique.mockResolvedValue({ id: 'exp-1', jobId: 'job-123', sessionId: 'sess-1', status: 'PENDING' });
    prisma.patientSession.findUnique.mockResolvedValue({ id: 'sess-1', therapistId: 'therapist-1' });

    await getExportStatusController(req, res);

    expect(res.statusCode).toBe(200);
    const body = res._getJSONData();
    expect(body.success).toBe(true);
    expect(body.export).toBeTruthy();
  });

  it('forbids access if therapist does not own session', async () => {
    const req: any = httpMocks.createRequest({ params: { jobId: 'job-456' }, auth: { userId: 'therapist-1' } });
    const res: any = httpMocks.createResponse();

    prisma.sessionExport.findUnique.mockResolvedValue({ id: 'exp-2', jobId: 'job-456', sessionId: 'sess-2', status: 'PENDING' });
    prisma.patientSession.findUnique.mockResolvedValue({ id: 'sess-2', therapistId: 'therapist-999' });

    await getExportStatusController(req, res);

    expect(res.statusCode).toBe(403);
    const body = res._getJSONData();
    expect(body.success).toBe(false);
  });
});
