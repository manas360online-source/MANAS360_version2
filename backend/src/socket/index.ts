import { Server as IOServer, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createClient, RedisClientType } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { prisma } from '../config/db';
import client from 'prom-client';
import os from 'os';

type JwtPayload = {
  sub: string;
  role?: string;
  iat?: number;
  exp?: number;
  [k: string]: any;
};

export async function initSocket(server: http.Server) {
  const io = new IOServer(server, {
    cors: {
      origin: true,
      credentials: true,
    },
    path: '/socket.io',
    pingTimeout: 30000,
  });

  // Redis adapter for horizontal scaling + pub/sub
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const pubClient: RedisClientType = createClient({ url: redisUrl });
  const subClient: RedisClientType = pubClient.duplicate();

  // Streams configuration
  const STREAM_KEY = 'session:events';
  const STREAM_GROUP = 'manas360_stream_group';
  const CONSUMER_NAME = `${os.hostname()}:${process.pid}`;

  let redisAvailable = false;

  // Prometheus metrics
  const redisUp = new client.Gauge({ name: 'socket_redis_up', help: 'Redis availability (1 up, 0 down)' });
  const streamProcessed = new client.Counter({ name: 'socket_stream_processed_total', help: 'Total stream entries processed' });
  const streamErrors = new client.Counter({ name: 'socket_stream_errors_total', help: 'Stream processing errors' });
  const pendingDbGauge = new client.Gauge({ name: 'socket_pending_db_rows', help: 'Number of DB pending delivery rows' });
  const rateLimitRejected = new client.Counter({ name: 'socket_rate_limit_rejected_total', help: 'Rate limit rejections' });
  const messageLatency = new client.Histogram({
    name: 'app_message_latency_seconds',
    help: 'End-to-end message processing latency (seconds)',
    labelNames: ['instance', 'role'],
    buckets: [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2]
  });
  const activeConnections = new client.Gauge({ name: 'app_ws_active_connections', help: 'Active websocket connections', labelNames: ['instance'] });
  const droppedConnections = new client.Counter({ name: 'app_ws_dropped_connections_total', help: 'Dropped websocket connections', labelNames: ['instance', 'reason'] });

  // background flag to stop consumer on shutdown
  let shuttingDown = false;

  async function setupRedisAdapter() {
    try {
      await pubClient.connect();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      redisAvailable = true;
      redisUp.set(1);
      console.log('Redis adapter connected');

      // ensure consumer group exists
      try {
        await pubClient.sendCommand(['XGROUP', 'CREATE', STREAM_KEY, STREAM_GROUP, '$', 'MKSTREAM']);
      } catch (e: any) {
        // ignore BUSYGROUP - group already exists
        if (!String(e).includes('BUSYGROUP')) console.warn('XGROUP create warning', e);
      }

      // start consumer loop
      startConsumerLoop().catch((err) => console.error('consumer loop error', err));

      // subscribe to presence update pubsub channels and broadcast to rooms
      try {
        // pattern: presence:updates:<sessionId>
        await subClient.pSubscribe('presence:updates:*', (message, channel) => {
          try {
            const parts = channel.split(':');
            const sessionId = parts[2];
            const payload = JSON.parse(message);
            io.to(sessionId).emit('presence:update', payload);
          } catch (e) {
            console.warn('presence psubscribe handler error', e);
          }
        });
      } catch (e) {
        console.warn('Failed to pSubscribe presence channels', e);
      }

      pubClient.on('error', (e) => {
        console.error('Redis client error', e);
        redisAvailable = false;
        redisUp.set(0);
      });
      pubClient.on('end', () => {
        console.warn('Redis connection ended');
        redisAvailable = false;
        redisUp.set(0);
      });
    } catch (err) {
      console.warn('Redis adapter not available, continuing without it', err);
      redisAvailable = false;
      redisUp.set(0);
    }
  }

  // initialize but don't fail startup if Redis is down
  void setupRedisAdapter();

  // JWT auth middleware for socket connections
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || (socket.handshake.headers?.authorization || '').split(' ')[1];
      if (!token) return next(new Error('Authentication error: token missing'));
      const payload = jwt.verify(token, env.jwtAccessSecret) as JwtPayload;
      // attach minimal user info to socket
      socket.data.user = { id: payload.sub, role: payload.role, raw: payload };
      console.info('socket.auth_success', { userId: payload.sub, role: payload.role, socketId: socket.id });
      return next();
    } catch (err) {
      console.warn('socket.auth_failed', { err: String(err), socketId: socket.id });
      return next(new Error('Authentication error'));
    }
  });

  // Basic per-socket rate limiter (simple token bucket)
  // Use Redis-backed sliding window rate limiter for global enforcement
  const RATE_LIMIT_PER_MINUTE = 120; // configurable
  io.use((socket, next) => {
    (socket as any).allowEvent = async (cost = 1): Promise<boolean> => {
      try {
        const userId = socket.data.user?.id || socket.id;
        const window = Math.floor(Date.now() / 60000);
        const key = `rl:${userId}:${window}`;
        if (!redisAvailable) return true; // allow when redis down (best-effort)
        const cur = await pubClient.incr(key);
        if (cur === 1) await pubClient.expire(key, 65);
        if (cur > RATE_LIMIT_PER_MINUTE) {
          await pubClient.incr(`rl_rejects:${userId}`);
          rateLimitRejected.inc();
          return false;
        }
        return true;
      } catch (e) {
        // on error allow to avoid hard failure; could be tightened
        return true;
      }
    };
    next();
  });

  // Helper: authorize a user to join a session room
  async function authorizeJoin(sessionId: string, userId: string, role?: string) {
    const session = await prisma.patientSession.findUnique({ where: { id: sessionId }, include: { template: true } });
    if (!session) return false;
    if (role === 'patient' && session.patientId === userId) return true;
    // allow therapist if they own the template or are assigned (assignedTherapistId)
    if (role === 'therapist') {
      if ((session as any).assignedTherapistId && (session as any).assignedTherapistId === userId) return true;
      if (session.template && (session.template as any).therapistId === userId) return true;
    }
    // admins allowed
    if (role === 'admin') return true;
    return false;
  }

  io.on('connection', (socket) => {
    const user = socket.data.user;
    // increment active connections
    try { activeConnections.labels(os.hostname()).inc(); } catch (e) {}
    console.info('socket.connect', { socketId: socket.id, userId: user?.id, role: user?.role });

    socket.on('join_session', async (payload: { sessionId: string }) => {
      if (!(await (socket as any).allowEvent(1))) return socket.emit('error', { code: 'RATE_LIMIT' });
      const { sessionId } = payload;
      try {
        const ok = await authorizeJoin(sessionId, user.id, user.role);
        if (!ok) return socket.emit('join_denied', { reason: 'unauthorized' });
        // join the room
        await socket.join(sessionId);
        // broadcast presence
        const socketsInRoom = await io.in(sessionId).allSockets();
        io.to(sessionId).emit('presence', { count: socketsInRoom.size });
        socket.emit('joined', { sessionId });
      } catch (err) {
        socket.emit('join_error', { error: String(err) });
      }
    });

    socket.on('leave_session', async (payload: { sessionId: string }) => {
      const { sessionId } = payload;
      await socket.leave(sessionId);
      const socketsInRoom = await io.in(sessionId).allSockets();
      io.to(sessionId).emit('presence', { count: socketsInRoom.size });
      socket.emit('left', { sessionId });
    });

    // example: patient submits answer -> server persists and notifies therapist
    socket.on('answer_submitted', async (data: { sessionId: string; questionId: string; answer: any; messageId?: string }) => {
      const start = Date.now();
      if (!(await (socket as any).allowEvent(1))) return socket.emit('error', { code: 'RATE_LIMIT' });
      const { sessionId, questionId, answer } = data;
      let { messageId } = data as { messageId?: string };
      try {
        const ok = await authorizeJoin(sessionId, user.id, user.role);
        if (!ok) return socket.emit('error', { code: 'NOT_AUTHORIZED' });

        if (!messageId) messageId = randomUUID();
        const payload = { messageId, from: user.id, questionId, answer, at: Date.now(), sessionId };

        // Idempotent persist: if messageId exists, return DUPLICATE ack
        try {
          const existing = await prisma.patientSessionResponse.findUnique({ where: { messageId } });
          if (existing) {
            // already persisted - reply with DUPLICATE ack
            const pendingDelivery = !existing.deliveredToStream;
            socket.emit('answer_ack', { messageId, questionId, status: 'DUPLICATE', pendingDelivery });
            return;
          }
        } catch (e) {
          console.warn('findUnique messageId error', e);
        }

        // Persist to DB first for durability
        try {
          await prisma.patientSessionResponse.create({ data: { sessionId, patientId: user.role === 'patient' ? user.id : undefined, questionId, responseData: answer, messageId, acknowledgedAt: new Date() } as any });
        } catch (e: any) {
          // handle unique constraint race - if message was created concurrently, fallback to duplicate ack
          if (String(e).includes('Unique') || String(e).includes('unique')) {
            const existing = await prisma.patientSessionResponse.findUnique({ where: { messageId } });
            const pendingDelivery = existing ? !existing.deliveredToStream : true;
            socket.emit('answer_ack', { messageId, questionId, status: 'DUPLICATE', pendingDelivery });
            return;
          }
          socket.emit('error', { code: 'PERSIST_FAIL', message: String(e) });
          return;
        }

        // Try to append to Redis Stream for durable cross-node delivery
        let addedToStream = false;
        if (redisAvailable) {
          try {
            await pubClient.sendCommand(['XADD', STREAM_KEY, '*', 'messageId', messageId, 'payload', JSON.stringify(payload)]);
            addedToStream = true;
          } catch (e) {
            console.warn('XADD failed, marking redis unavailable', e);
            redisAvailable = false;
            redisUp.set(0);
          }
        }

        // mark deliveredToStream if we managed to enqueue
        try {
          if (addedToStream) {
            await prisma.patientSessionResponse.update({ where: { messageId }, data: { deliveredToStream: true } as any });
          }
          await prisma.patientSessionResponse.update({ where: { messageId }, data: { acknowledgedAt: new Date() } as any });
        } catch (e) {
          console.warn('update deliveredToStream/acknowledgedAt failed', e);
        }

        // Immediate local emit for low-latency feedback; cross-node delivery guaranteed by stream consumer
        socket.to(sessionId).emit('answer_received', payload);
        socket.emit('answer_ack', { messageId, questionId, status: 'ACCEPTED', pendingDelivery: !addedToStream });
        // observe latency
        try {
          const seconds = (Date.now() - start) / 1000;
          messageLatency.labels(os.hostname(), user?.role || 'unknown').observe(seconds);
        } catch (e) {}
      } catch (err) {
        socket.emit('error', { code: 'SERVER_ERROR', message: String(err) });
      }
    });

    socket.on('typing', (data: { sessionId: string; isTyping: boolean }) => {
      if (!(socket as any).consume(0.2)) return;
      socket.to(data.sessionId).emit('typing', { userId: user.id, isTyping: data.isTyping });
    });

    socket.on('sync_state', async (data: { sessionId: string }) => {
      // allow clients to request latest persisted state
      try {
        const responses = await prisma.patientSessionResponse.findMany({ where: { sessionId: data.sessionId }, orderBy: { answeredAt: 'asc' } });
        socket.emit('state_snapshot', { responses });
      } catch (e) {
        socket.emit('error', { code: 'SNAPSHOT_FAIL' });
      }
    });

    socket.on('disconnecting', () => {
      // optionally emit presence changes after disconnect
    });
    socket.on('disconnect', (reason) => {
      try { activeConnections.labels(os.hostname()).dec(); } catch (e) {}
      try { droppedConnections.labels(os.hostname(), String(reason)).inc(); } catch (e) {}
      console.info('socket.disconnect', { socketId: socket.id, reason });
    });
  });
  // Consumer loop: read from stream using XREADGROUP and deliver events
  async function startConsumerLoop() {
    while (!shuttingDown) {
      try {
        if (!redisAvailable) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        // Read entries for this consumer
        const res: any = await pubClient.sendCommand(['XREADGROUP', 'GROUP', STREAM_GROUP, CONSUMER_NAME, 'BLOCK', '5000', 'COUNT', '10', 'STREAMS', STREAM_KEY, '>']);
        if (!res) continue;
        // res structure: [[streamKey, [[id, [field, value, ...]], ...]]] 
        for (const streamArr of res) {
          const entries = streamArr[1];
          for (const entry of entries) {
            const id = entry[0];
            const pairs: any[] = entry[1];
            const obj: any = {};
            for (let i = 0; i < pairs.length; i += 2) obj[pairs[i]] = pairs[i + 1];
            try {
              const messageId = obj.messageId;
              const payload = JSON.parse(obj.payload || '{}');
              // dedupe using SET NX
              const dedupeKey = `socket_msg:${messageId}`;
              const setOk = await pubClient.set(dedupeKey, '1', { NX: true, EX: 3600 });
              if (!setOk) {
                // already processed
                await pubClient.sendCommand(['XACK', STREAM_KEY, STREAM_GROUP, id]);
                continue;
              }

              // emit to room
              io.to(payload.sessionId).emit('answer_received', payload);
              streamProcessed.inc();

              // mark processed in stream
              await pubClient.sendCommand(['XACK', STREAM_KEY, STREAM_GROUP, id]);
            } catch (err) {
              streamErrors.inc();
              console.error('Error processing stream entry', err);
            }
          }
        }
      } catch (err) {
        console.error('Consumer loop iteration error', err);
        streamErrors.inc();
        redisAvailable = false;
        redisUp.set(0);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // Periodic background job: find DB rows with _pendingDelivery and push to stream
  async function drainPendingResponses() {
    while (!shuttingDown) {
      try {
        if (!redisAvailable) {
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        const pending = await prisma.patientSessionResponse.findMany({ where: { deliveredToStream: false }, take: 50 });
        pendingDbGauge.set(pending.length);
        for (const row of pending) {
          try {
            const messageId = row.messageId || randomUUID();
            const payload = { messageId, from: row.patientId, questionId: row.questionId, answer: row.responseData, at: Date.now(), sessionId: row.sessionId };
            await pubClient.sendCommand(['XADD', STREAM_KEY, '*', 'messageId', messageId, 'payload', JSON.stringify(payload)]);
            // mark deliveredToStream
            await prisma.patientSessionResponse.update({ where: { id: row.id }, data: { deliveredToStream: true } as any });
          } catch (e) {
            console.warn('Failed to requeue pending response', e);
          }
        }
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error('drainPendingResponses error', e);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  void drainPendingResponses();

  // Presence cleanup: check zset entries older than TTL and mark offline in DB
  const PRESENCE_TTL_MS = 60 * 1000; // 60s
  async function presenceCleanup() {
    while (!shuttingDown) {
      try {
        if (!redisAvailable) {
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        // find presence keys using SCAN for pattern
        let cursor = 0;
        do {
          const res: any = await pubClient.sendCommand(['SCAN', String(cursor), 'MATCH', 'session:presence:*', 'COUNT', '200']);
          cursor = Number(res[0]);
          const keys = res[1] || [];
          for (const key of keys) {
            try {
              const now = Date.now();
              // remove stale members
              const staleMax = now - PRESENCE_TTL_MS;
              // get members with score less than staleMax
              const stale = (await pubClient.sendCommand(['ZRANGEBYSCORE', key, '-inf', String(staleMax)])) as any[];
              if (stale && stale.length > 0) {
                // remove them
                await pubClient.sendCommand(['ZREM', key, ...stale as any[]]);
                // recompute current online users and publish update
                const remaining = (await pubClient.sendCommand(['ZRANGE', key, '0', '-1'])) as any[];
                const onlineUsers = {} as Record<string, { userId: string; role: string; clientCount: number }>;
                for (const mem of remaining) {
                  const parts = mem.split(':');
                  if (parts.length < 3) continue;
                  const rrole = parts[0];
                  const uid = parts[1];
                  const k = `${rrole}:${uid}`;
                  onlineUsers[k] = onlineUsers[k] || { userId: uid, role: rrole, clientCount: 0 };
                  onlineUsers[k].clientCount += 1;
                }
                const summary = Object.values(onlineUsers).map((v) => ({ userId: v.userId, role: v.role, clientCount: v.clientCount }));
                const sessionId = key.split(':')[2];
                await pubClient.sendCommand(['PUBLISH', `presence:updates:${sessionId}`, JSON.stringify({ sessionId, summary })]);
                // sync to DB: simple approach - set offline for any DB rows not in summary
                const onlineUserIds = Object.keys(onlineUsers).map((k) => onlineUsers[k].userId);
                // find DB presence rows for this session that are ONLINE but not in onlineUserIds and mark OFFLINE
                try {
                  const rows = await prisma.sessionPresence.findMany({ where: { sessionId, status: 'ONLINE' } });
                  for (const r of rows) {
                    if (!onlineUserIds.includes(r.userId)) {
                      await prisma.sessionPresence.update({ where: { sessionId_userId_role: { sessionId: r.sessionId, userId: r.userId, role: r.role as any } }, data: { status: 'OFFLINE', clientCount: 0 } });
                    }
                  }
                } catch (e) {
                  console.warn('presence DB sync error', e);
                }
              }
            } catch (e) {
              console.warn('presenceCleanup key iteration error', e);
            }
          }
        } while (cursor !== 0);
        await new Promise((r) => setTimeout(r, 10000));
      } catch (e) {
        console.error('presenceCleanup error', e);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  void presenceCleanup();

  return io;
}

export default initSocket;
