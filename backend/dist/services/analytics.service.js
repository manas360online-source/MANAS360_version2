"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = void 0;
const db_1 = require("../config/db");
const redis_1 = require("redis");
const env_1 = require("../config/env");
const redisUrl = process.env.REDIS_URL || env_1.env.redisUrl || 'redis://127.0.0.1:6379';
const redis = (0, redis_1.createClient)({ url: redisUrl });
redis.on('error', (error) => {
    console.warn('[analytics.service] Redis unavailable, cache layer degraded', error);
});
redis.connect().catch(() => { });
class AnalyticsService {
    cacheTtl = 300; // seconds
    /**
     * Delete any cached analytics keys for a given therapist so dashboards
     * will reload fresh values after a materialized view refresh.
     */
    async invalidateCacheForTherapist(therapistId) {
        try {
            const pattern = `analytics:*:therapist:${therapistId}:*`;
            // keys can be expensive; keep it scoped and infrequent (on session complete)
            const keys = await redis.keys(pattern);
            if (keys && keys.length) {
                await redis.del(keys);
            }
        }
        catch (e) {
            // noop on cache invalidation failure
        }
    }
    cacheKey(prefix, therapistId, from, to, extra = '') {
        return `analytics:${prefix}:therapist:${therapistId}:${from}:${to}:${extra}`;
    }
    async getSummary(therapistId, range) {
        const key = this.cacheKey('summary', therapistId, range.from, range.to);
        try {
            const cached = await redis.get(key);
            if (cached)
                return JSON.parse(cached);
        }
        catch (e) { }
        // Prefer reading from materialized view `analytics_session_metrics` for speed
        try {
            const rows = await db_1.prisma.$queryRawUnsafe(`SELECT
            COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed,
            COUNT(*) AS total,
            ROUND(100.0 * COUNT(*) FILTER (WHERE completed_at IS NOT NULL) / NULLIF(COUNT(*),0), 2) AS completion_rate,
            ROUND(AVG(duration_seconds/60)::numeric,2) AS avg_minutes,
            COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS sessions
          FROM analytics_session_metrics m
          WHERE m.therapist_id = $1
            AND m.started_at >= $2::timestamptz
            AND m.started_at < $3::timestamptz;`, therapistId, range.from, range.to);
            const r = rows[0] ?? {};
            const summary = {
                completion: r?.completed ?? 0,
                total: r?.total ?? 0,
                completionRate: Number(r?.completion_rate) ?? 0,
                avgMinutes: Number(r?.avg_minutes) ?? 0,
                sessions: Number(r?.sessions) ?? 0,
            };
            try {
                await redis.setEx(key, this.cacheTtl, JSON.stringify(summary));
            }
            catch (e) { }
            return summary;
        }
        catch (e) {
            // fallback to live SQL if materialized view not available
        }
        // Fallback: live aggregation
        const completionSql = `
      SELECT
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed,
        COUNT(*) AS total,
        ROUND(100.0 * COUNT(*) FILTER (WHERE completed_at IS NOT NULL) / NULLIF(COUNT(*),0), 2) AS completion_rate
      FROM patient_sessions ps
      JOIN templates t ON t.id = ps.template_id
      WHERE t.therapist_id = $1
        AND ps.started_at >= $2::timestamptz
        AND ps.started_at <  $3::timestamptz;
    `;
        const avgDurationSql = `
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))/60)::numeric,2) AS avg_minutes
      FROM patient_sessions ps
      JOIN templates t ON t.id = ps.template_id
      WHERE t.therapist_id = $1
        AND ps.completed_at IS NOT NULL
        AND ps.completed_at BETWEEN $2::timestamptz AND $3::timestamptz;
    `;
        const sessionsCountSql = `
      SELECT COUNT(*) AS sessions
      FROM patient_sessions ps
      JOIN templates t ON t.id = ps.template_id
      WHERE t.therapist_id = $1
        AND ps.completed_at BETWEEN $2::timestamptz AND $3::timestamptz;
    `;
        const [completionRes, avgRes, countRes] = await Promise.all([
            db_1.prisma.$queryRawUnsafe(completionSql, therapistId, range.from, range.to),
            db_1.prisma.$queryRawUnsafe(avgDurationSql, therapistId, range.from, range.to),
            db_1.prisma.$queryRawUnsafe(sessionsCountSql, therapistId, range.from, range.to),
        ]);
        const summary = {
            completion: completionRes[0]?.completion ?? 0,
            total: completionRes[0]?.total ?? 0,
            completionRate: Number(completionRes[0]?.completion_rate) ?? 0,
            avgMinutes: Number(avgRes[0]?.avg_minutes) ?? 0,
            sessions: Number(countRes[0]?.sessions) ?? 0,
        };
        try {
            await redis.setEx(key, this.cacheTtl, JSON.stringify(summary));
        }
        catch (e) { }
        return summary;
    }
    async getTimeSeries(therapistId, range, granularity) {
        const key = this.cacheKey('timeseries', therapistId, range.from, range.to, granularity);
        try {
            const cached = await redis.get(key);
            if (cached)
                return JSON.parse(cached);
        }
        catch (e) { }
        const trunc = granularity === 'day' ? 'day' : granularity === 'week' ? 'week' : 'month';
        // Prefer materialized view for time-series if present
        try {
            const sql = `
        SELECT date_trunc('${trunc}', completed_at) AS period,
               COUNT(*) AS sessions,
               ROUND(AVG(duration_seconds/60)::numeric,2) AS avg_minutes
        FROM analytics_session_metrics m
        WHERE m.therapist_id = $1
          AND m.completed_at BETWEEN $2::timestamptz AND $3::timestamptz
        GROUP BY 1
        ORDER BY 1;
      `;
            const rows = await db_1.prisma.$queryRawUnsafe(sql, therapistId, range.from, range.to);
            const out = rows.map((r) => ({ period: r.period.toISOString?.() ?? String(r.period), sessions: Number(r.sessions), avgMinutes: Number(r.avg_minutes) }));
            try {
                await redis.setEx(key, this.cacheTtl, JSON.stringify(out));
            }
            catch (e) { }
            return out;
        }
        catch (e) {
            // fallback to live aggregation
        }
        const sql = `
      SELECT date_trunc('${trunc}', ps.completed_at) AS period,
             COUNT(*) AS sessions,
             ROUND(AVG(EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))/60)::numeric,2) AS avg_minutes
      FROM patient_sessions ps
      JOIN templates t ON t.id = ps.template_id
      WHERE t.therapist_id = $1
        AND ps.completed_at BETWEEN $2::timestamptz AND $3::timestamptz
      GROUP BY 1
      ORDER BY 1;
    `;
        const rows = await db_1.prisma.$queryRawUnsafe(sql, therapistId, range.from, range.to);
        const out = rows.map((r) => ({ period: r.period.toISOString?.() ?? String(r.period), sessions: Number(r.sessions), avgMinutes: Number(r.avg_minutes) }));
        try {
            await redis.setEx(key, this.cacheTtl, JSON.stringify(out));
        }
        catch (e) { }
        return out;
    }
    async getDropOff(therapistId, range, templateId) {
        const key = this.cacheKey('dropoff', therapistId, range.from, range.to, templateId ?? 'all');
        try {
            const cached = await redis.get(key);
            if (cached)
                return JSON.parse(cached);
        }
        catch (e) { }
        // compute last answered question index per session
        const sql = `
      WITH last_index AS (
        SELECT r.session_id, MAX(q.order_index) AS last_index
        FROM responses r
        JOIN questions q ON q.id = r.question_id
        JOIN patient_sessions ps ON ps.id = r.session_id
        JOIN templates t ON t.id = ps.template_id
        WHERE t.therapist_id = $1
          AND ps.started_at >= $2::timestamptz
          AND ps.started_at <  $3::timestamptz
          ${templateId ? 'AND t.id = $4' : ''}
        GROUP BY r.session_id
      )
      SELECT last_index AS question_index, COUNT(*) AS sessions
      FROM last_index
      GROUP BY last_index
      ORDER BY last_index;
    `;
        const params = [therapistId, range.from, range.to];
        if (templateId)
            params.push(templateId);
        const rows = await db_1.prisma.$queryRawUnsafe(sql, ...params);
        const out = rows.map((r) => ({ questionIndex: Number(r.question_index), sessions: Number(r.sessions) }));
        try {
            await redis.setEx(key, this.cacheTtl, JSON.stringify(out));
        }
        catch (e) { }
        return out;
    }
}
exports.AnalyticsService = AnalyticsService;
exports.analyticsService = new AnalyticsService();
