import { cbtSessionService } from '../src/services/cbt-session.service';
import { prisma } from '../src/config/db';

jest.mock('../src/config/db', () => ({
  prisma: {
    cBTSessionTemplate: { findUnique: jest.fn(), update: jest.fn() },
    cBTSessionVersion: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    patientSession: { create: jest.fn() },
    $transaction: jest.fn((fn: any) => fn({
      cBTSessionTemplate: { findUnique: jest.fn(), update: jest.fn() },
      cBTSessionVersion: { create: jest.fn(), findFirst: jest.fn() },
    }))
  }
}));

describe('CBT session versioning', () => {
  afterEach(() => jest.resetAllMocks());

  test('createTemplateVersion creates a version and bumps template', async () => {
    (prisma.cBTSessionTemplate.findUnique as any).mockResolvedValue({ id: 'tpl1', version: 1, therapistId: 'u1' });
    const created = { id: 'v1', version: 2 };
    (prisma.cBTSessionVersion.create as any).mockResolvedValue(created);
    (prisma.cBTSessionTemplate.update as any).mockResolvedValue({ id: 'tpl1', version: 2 });

    const res = await cbtSessionService.createTemplateVersion('tpl1', 'u1', { title: 'snapshot' }, { publish: false });
    expect(res).toBeDefined();
  });

  test('duplicateVersion calls createTemplateVersion', async () => {
    (prisma.cBTSessionVersion.findUnique as any).mockResolvedValue({ id: 'v1', sessionId: 'tpl1', snapshotData: { title: 's' } });
    const spy = jest.spyOn(cbtSessionService as any, 'createTemplateVersion');
    (spy as any).mockResolvedValue({ id: 'v2' });

    const res = await cbtSessionService.duplicateVersion('v1', 'u1', { publish: false });
    expect(spy).toHaveBeenCalled();
  });

  test('compareVersions returns diff array', async () => {
    (prisma.cBTSessionVersion.findFirst as any).mockImplementation(({ where }: any) => {
      if (where.version === 1) return Promise.resolve({ snapshotData: { a: 1, nested: { x: 1 } } });
      return Promise.resolve({ snapshotData: { a: 2, nested: { x: 1 } } });
    });

    const diff = await cbtSessionService.compareVersions('tpl1', 1, 2);
    expect(Array.isArray(diff)).toBe(true);
    expect(diff.length).toBeGreaterThanOrEqual(1);
  });
});
