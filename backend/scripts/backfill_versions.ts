/**
 * Backfill script: create initial CBTSessionVersion rows for existing templates
 * Usage: `node dist/scripts/backfill_versions.js` after building, or run with ts-node in dev
 */
import { prisma } from '../src/config/db';
import crypto from 'crypto';

async function run() {
  console.log('Starting backfill of CBTSessionVersion for existing templates...');
  const templates = await prisma.cBTSessionTemplate.findMany({ include: { questions: true } });
  for (const t of templates) {
    // check if versions exist
    const existing = await prisma.cBTSessionVersion.findFirst({ where: { sessionId: t.id } });
    if (existing) continue;
    const snapshot = t;
    const checksum = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
    const version = t.version || 1;
    await prisma.cBTSessionVersion.create({ data: { sessionId: t.id, version, snapshotData: snapshot as any, createdBy: t.therapistId, publishedAt: t.publishedAt ?? null, isDraft: t.status !== 'PUBLISHED', checksum } });
    console.log(`Backfilled template ${t.id} v${version}`);
  }
  console.log('Backfill complete');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
