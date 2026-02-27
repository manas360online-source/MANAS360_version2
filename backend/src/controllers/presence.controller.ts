import type { Request, Response } from 'express';
import { createClient } from 'redis';
import { prisma } from '../config/db';
import { env } from '../config/env';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const TTL_SECONDS = 60; // presence TTL window

function zsetKey(sessionId: string) {
  return `session:presence:${sessionId}`;
}

function presenceMember(role: string, userId: string, clientId: string) {
  return `${role}:${userId}:${clientId}`;
}

export async function heartbeat(req: Request, res: Response) {
  const { sessionId, clientId, role } = req.body as { sessionId: string; clientId?: string; role?: string };
  const userId = (req as any).auth?.userId;
  if (!userId || !sessionId) return res.status(400).json({ error: 'missing params' });
  const cid = clientId || 'default';
  const r = createClient({ url: REDIS_URL });
  await r.connect();
  const key = zsetKey(sessionId);
  const member = presenceMember(role || 'PATIENT', userId, cid);
  const now = Date.now();
  try {
    await r.zAdd(key, { score: now, value: member });
    await r.expire(key, TTL_SECONDS + 30);

    // compute clientCount for this user by scanning members
    const all = await r.zRange(key, 0, -1);
    const userMembers = all.filter((m) => m.startsWith(`${(role || 'PATIENT')}:${userId}:`));
    const clientCount = userMembers.length;

    // upsert DB presence
    await prisma.sessionPresence.upsert({
      where: { sessionId_userId_role: { sessionId, userId, role: (role || 'PATIENT') as any } },
      update: { lastSeenAt: new Date(now), status: 'ONLINE', clientCount },
      create: { sessionId, userId, role: (role || 'PATIENT') as any, lastSeenAt: new Date(now), status: 'ONLINE', clientCount },
    });

    // publish compact presence summary for socket layer to broadcast
    const onlineUsers = new Map<string, { userId: string; role: string; clientCount: number; lastSeenAt: number }>();
    for (const mem of all) {
      const parts = mem.split(':');
      if (parts.length < 3) continue;
      const rrole = parts[0];
      const uid = parts[1];
      const cId = parts.slice(2).join(':');
      const keyUser = `${rrole}:${uid}`;
      const cur = onlineUsers.get(keyUser) || { userId: uid, role: rrole, clientCount: 0, lastSeenAt: now };
      cur.clientCount += 1;
      onlineUsers.set(keyUser, cur);
    }

    const summary = Array.from(onlineUsers.values()).map((v) => ({ userId: v.userId, role: v.role, clientCount: v.clientCount, lastSeenAt: v.lastSeenAt }));

    await r.publish(`presence:updates:${sessionId}`, JSON.stringify({ sessionId, by: userId, summary }));

    await r.disconnect();
    return res.json({ ok: true, clientCount });
  } catch (e) {
    await r.disconnect();
    return res.status(500).json({ error: String(e) });
  }
}

export async function unloadBeacon(req: Request, res: Response) {
  const { sessionId, clientId, role } = req.body as { sessionId: string; clientId?: string; role?: string };
  const userId = (req as any).auth?.userId;
  if (!userId || !sessionId) return res.status(400).json({ error: 'missing params' });
  const cid = clientId || 'default';
  const r = createClient({ url: REDIS_URL });
  await r.connect();
  const key = zsetKey(sessionId);
  const member = presenceMember(role || 'PATIENT', userId, cid);
  try {
    await r.zRem(key, member);
    // recompute
    const all = await r.zRange(key, 0, -1);
    const onlineUsers = new Map<string, { userId: string; role: string; clientCount: number }>();
    for (const mem of all) {
      const parts = mem.split(':');
      if (parts.length < 3) continue;
      const rrole = parts[0];
      const uid = parts[1];
      const keyUser = `${rrole}:${uid}`;
      const cur = onlineUsers.get(keyUser) || { userId: uid, role: rrole, clientCount: 0 };
      cur.clientCount += 1;
      onlineUsers.set(keyUser, cur);
    }

    const summary = Array.from(onlineUsers.values()).map((v) => ({ userId: v.userId, role: v.role, clientCount: v.clientCount }));
    await r.publish(`presence:updates:${sessionId}`, JSON.stringify({ sessionId, by: userId, summary }));

    // update DB: decrease clientCount; for simplicity set to current value
    const userKey = `${(role || 'PATIENT')}:${userId}`;
    const userMembers = all.filter((m) => m.startsWith(`${(role || 'PATIENT')}:${userId}:`));
    const clientCount = userMembers.length;
    if (clientCount === 0) {
      await prisma.sessionPresence.updateMany({ where: { sessionId, userId, role: (role || 'PATIENT') as any, status: 'ONLINE' }, data: { status: 'OFFLINE', clientCount: 0 } });
    } else {
      await prisma.sessionPresence.upsert({
        where: { sessionId_userId_role: { sessionId, userId, role: (role || 'PATIENT') as any } },
        update: { clientCount },
        create: { sessionId, userId, role: (role || 'PATIENT') as any, clientCount, lastSeenAt: new Date() },
      });
    }

    await r.disconnect();
    return res.json({ ok: true });
  } catch (e) {
    await r.disconnect();
    return res.status(500).json({ error: String(e) });
  }
}

export async function getSessionPresence(req: Request, res: Response) {
  const sessionId = req.params.id as string;
  if (!sessionId) return res.status(400).json({ error: 'missing sessionId' });
  const r = createClient({ url: REDIS_URL });
  await r.connect();
  try {
    const all = await r.zRange(zsetKey(sessionId), 0, -1);
    if (all.length === 0) {
      // fallback to DB
      const rows = await prisma.sessionPresence.findMany({ where: { sessionId } });
      await r.disconnect();
      return res.json({ presence: rows.map((r) => ({ userId: r.userId, role: r.role, status: r.status, lastSeenAt: r.lastSeenAt, clientCount: r.clientCount })) });
    }
    const onlineUsers = new Map<string, { userId: string; role: string; clientCount: number }>();
    for (const mem of all) {
      const parts = mem.split(':');
      if (parts.length < 3) continue;
      const rrole = parts[0];
      const uid = parts[1];
      const keyUser = `${rrole}:${uid}`;
      const cur = onlineUsers.get(keyUser) || { userId: uid, role: rrole, clientCount: 0 };
      cur.clientCount += 1;
      onlineUsers.set(keyUser, cur);
    }
    const summary = Array.from(onlineUsers.values()).map((v) => ({ userId: v.userId, role: v.role, clientCount: v.clientCount }));
    await r.disconnect();
    return res.json({ presence: summary });
  } catch (e) {
    await r.disconnect();
    return res.status(500).json({ error: String(e) });
  }
}
