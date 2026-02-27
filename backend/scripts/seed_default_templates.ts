import { prisma } from '../src/config/db';
import crypto from 'crypto';

const DEFAULTS = [
  { title: 'Anxiety CBT', tags: ['anxiety', 'cbt'], category: 'Anxiety', description: 'Standard anxiety CBT sequence' },
  { title: 'Depression CBT', tags: ['depression', 'cbt'], category: 'Depression', description: 'Standard depression CBT sequence' },
  { title: 'Thought Reframing', tags: ['cognitive', 'reframing'], category: 'Cognitive', description: 'Thought reframing exercises' },
  { title: 'Behavioral Activation', tags: ['behavioral', 'activation'], category: 'Behavioral', description: 'Behavioral activation plan' },
];

async function run() {
  console.log('Seeding default templates...');
  for (const d of DEFAULTS) {
    // create tags
    const tagIds: string[] = [];
    for (const t of d.tags) {
      const existing = await prisma.templateTag.findUnique({ where: { name: t } });
      let tag;
      if (!existing) tag = await prisma.templateTag.create({ data: { name: t } });
      else tag = existing;
      tagIds.push(tag.id);
    }

    // create template
    const tpl = await prisma.cBTSessionTemplate.create({
      data: {
        title: d.title,
        description: d.description,
        therapistId: 'system',
        status: 'PUBLISHED',
        version: 1,
        isOfficial: true,
        visibility: 'PUBLIC',
      },
    });

    // create initial version snapshot
    const snapshot = { id: tpl.id, title: tpl.title, description: tpl.description, questions: [] };
    const checksum = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
    const ver = await prisma.cBTSessionVersion.create({ data: { sessionId: tpl.id, version: 1, snapshotData: snapshot as any, createdBy: 'system', publishedAt: new Date(), isDraft: false, checksum } });

    // attach tags
    for (const tid of tagIds) {
      await prisma.templateTagOnTemplate.create({ data: { templateId: tpl.id, tagId: tid } as any });
    }

    // set latest_published_version_id
    await prisma.cBTSessionTemplate.update({ where: { id: tpl.id }, data: { latestPublishedVersionId: ver.id } });

    console.log(`Seeded ${d.title}`);
  }
  console.log('Default templates seeded.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
