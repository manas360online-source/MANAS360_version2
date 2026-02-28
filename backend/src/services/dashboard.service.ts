import { Types } from 'mongoose';
import TherapySessionModel from '../models/therapy-session.model';
import { prisma } from '../config/db';
import TherapistProfileModel from '../models/therapist.model';
import PatientProfileModel from '../models/patient.model';
import UserModel from '../models/user.model';
import { createClient } from 'redis';
import { env } from '../config/env';

const REDIS_URL = process.env.REDIS_URL || env.redisUrl || 'redis://127.0.0.1:6379';

type ListOpts = {
  therapistUserId: string;
  limit?: number;
  cursor?: string; // base64(dateISO|id)
  status?: string;
  from?: string;
  to?: string;
  q?: string;
};

function decodeCursor(cursor?: string): { date: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [dateStr, id] = decoded.split('|');
    return { date: new Date(dateStr), id };
  } catch (e) {
    return null;
  }
}

export async function listTherapistSessions(opts: ListOpts) {
  const limit = Math.min(opts.limit ?? 20, 100);

  // resolve therapist profile id from user id
  const therapist = await TherapistProfileModel.findOne({ userId: opts.therapistUserId }).select({ _id: 1 }).lean() as any;
  if (!therapist) return { items: [], nextCursor: null };

  const where: any = { therapistProfileId: String(therapist._id) };
  if (opts.status) where.status = String(opts.status).toUpperCase();
  if (opts.from || opts.to) {
    where.dateTime = {} as any;
    if (opts.from) where.dateTime.gte = new Date(opts.from);
    if (opts.to) where.dateTime.lte = new Date(opts.to);
  }

  // patient search (best-effort, limited to therapist's patients)
  if (opts.q) {
    const q = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await UserModel.find({ $or: [{ firstName: q }, { lastName: q }, { email: q }] }).select({ _id: 1 }).lean() as any;
    const userIds = users.map((u: any) => u._id);
    const patients = (await (PatientProfileModel.find({ userId: { $in: userIds } }).select({ _id: 1 }) as any).lean()) as any;
    const pIds = patients.map((p: any) => p._id);
    if (pIds.length === 0) return { items: [], nextCursor: null };
    where.patientProfileId = { in: pIds.map(String) };
  }

  // keyset cursor
  const cursor = decodeCursor(opts.cursor);
  if (cursor) {
    // dateTime descending cursor
    where.dateTime = { lt: cursor.date } as any;
  }

  const docs = await prisma.therapySession.findMany({
    where,
    select: { id: true, bookingReferenceId: true, patientProfileId: true, dateTime: true, status: true },
    orderBy: [{ dateTime: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const page = docs.slice(0, limit);
  const hasNext = docs.length > limit;

  // fetch patient snapshots for the page
  const patientIds = [...new Set(page.map((d: any) => String(d.patientProfileId)))];
  const patients = (await (PatientProfileModel.find({ _id: { $in: patientIds } }).select({ _id: 1, age: 1, userId: 1 }) as any).lean()) as any;
  const users = (await UserModel.find({ _id: { $in: patients.map((p: any) => p.userId) } }).select({ firstName: 1, lastName: 1 }).lean()) as any;

  const patientMap: Map<string, any> = new Map((patients as any).map((p: any) => [String(p._id), p]));
  const userMap: Map<string, any> = new Map((users as any).map((u: any) => [String(u._id), u]));

  const items = page.map((s: any) => {
    const pat = patientMap.get(String(s.patientProfileId));
    const user = pat ? userMap.get(String(pat.userId)) : null;
    const initials = user ? `${user.firstName?.charAt(0) ?? ''}.${user.lastName?.charAt(0) ?? ''}` : null;
    const ageRange = pat?.age ? `${Math.floor(pat.age / 10) * 10}-${Math.floor(pat.age / 10) * 10 + 9}` : null;
    return {
      sessionId: String(s.id),
      scheduledAt: s.dateTime,
      status: String(s.status).toLowerCase(),
      patient: { id: String(s.patientProfileId), initials, ageRange },
    };
  });

  // presence merge (best-effort)
  try {
    const r = createClient({ url: REDIS_URL });
    await r.connect();
    const sessionKeys = page.map((s: any) => `session:presence:${String(s.id)}`);
    const patientKeys = page.map((s: any) => `user:presence:${String(s.patientProfileId)}`);
    const results = await r.mGet([...sessionKeys, ...patientKeys]);
    await r.disconnect();
    const sessionPresence = new Map<string, boolean>();
    const patientPresence = new Map<string, boolean>();
    for (let i = 0; i < page.length; i++) sessionPresence.set(String(page[i].id), !!results[i]);
    for (let i = 0; i < page.length; i++) patientPresence.set(String(page[i].patientProfileId), !!results[page.length + i]);
    items.forEach((it: any) => {
      it.presence = { patientOnline: !!patientPresence.get(it.patient.id), sessionActive: !!sessionPresence.get(it.sessionId) };
    });
  } catch (e) {
    // ignore
  }

  const nextCursor = hasNext ? Buffer.from(`${page[page.length - 1].dateTime.toISOString()}|${String(page[page.length - 1].id)}`).toString('base64') : null;

  return { items, nextCursor };
}

export async function getTherapistSessionDetail(therapistUserId: string, sessionId: string) {
  const therapist = await TherapistProfileModel.findOne({ userId: therapistUserId }).select({ _id: 1 }).lean();
  if (!therapist) throw new Error('Therapist profile not found');

  const session = await TherapySessionModel.findOne({ _id: sessionId, therapistId: therapist._id })
    .select({ bookingReferenceId: 1, patientId: 1, dateTime: 1, status: 1, cancelledAt: 1 })
    .lean();
  if (!session) throw new Error('Session not found');

  // fetch responses (mongoose-based model may vary)
  let responses: any[] = [];
  try {
    const ResponseModel = require('../models/session-response.model').default;
    responses = await ResponseModel.find({ sessionId }).select({ _id: 1, questionId: 1, questionText: 1, answer: 1, createdAt: 1 }).sort({ createdAt: 1 }).lean();
  } catch (e) {
    // ignore
  }

  // presence
  let presence = { patientOnline: false, sessionActive: false };
  try {
    const r = createClient({ url: REDIS_URL });
    await r.connect();
    const sessionVal = await r.get(`session:presence:${sessionId}`);
    const patientVal = await r.get(`user:presence:${String(session.patientProfileId)}`);
    await r.disconnect();
    presence = { patientOnline: !!patientVal, sessionActive: !!sessionVal };
  } catch (e) {}

  return {
    session: { id: String(session.id), scheduledAt: session.dateTime, status: String(session.status).toLowerCase(), cancelledAt: session.cancelledAt },
    responses,
    presence,
  };
}
