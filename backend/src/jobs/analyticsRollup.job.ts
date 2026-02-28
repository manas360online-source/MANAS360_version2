import { prisma } from '../config/db';
import { env } from '../config/env';

const DEFAULT_INTERVAL = Number(env.analyticsRollupIntervalSeconds || 3600); // seconds

async function ensureMaterializedView() {
	const createSql = `DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'analytics_session_metrics') THEN
		EXECUTE $$
			CREATE MATERIALIZED VIEW analytics_session_metrics AS
			SELECT
				ps.id AS session_id,
				t.therapist_id,
				ps.patient_id,
				ps.started_at,
				ps.completed_at,
				EXTRACT(EPOCH FROM (ps.completed_at - ps.started_at))::int AS duration_seconds,
				(SELECT COUNT(*) FROM responses r WHERE r.session_id = ps.id) AS answered_count,
				(SELECT COUNT(*) FROM questions q WHERE q.template_id = t.id) AS total_questions,
				AVG((r.response_data->>'score')::numeric) AS session_score,
				ps.template_version
			FROM patient_sessions ps
			JOIN templates t ON t.id = ps.template_id
			LEFT JOIN responses r ON r.session_id = ps.id
			WHERE ps.completed_at IS NOT NULL
			GROUP BY ps.id, t.therapist_id, ps.patient_id, ps.started_at, ps.completed_at, ps.template_version;
		$$;

		EXECUTE $$CREATE UNIQUE INDEX idx_analytics_session_metrics_session_id ON analytics_session_metrics(session_id);$$;
		EXECUTE $$CREATE INDEX idx_analytics_session_metrics_therapist_completed_at ON analytics_session_metrics(therapist_id, completed_at);$$;
	END IF;
END
$$;`;

	await prisma.$executeRawUnsafe(createSql);
}

export async function refreshAnalyticsMaterializedViews() {
	try {
		await ensureMaterializedView();
		// Use CONCURRENTLY where possible to avoid long locks
		try {
			await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_session_metrics;');
		} catch (e) {
			// fallback to non-concurrent refresh if concurrent fails (e.g., lack of unique index or permission)
			await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW analytics_session_metrics;');
		}
		console.log('analytics: refreshed materialized views');
	} catch (err) {
		console.error('analytics: failed to refresh materialized views', err);
	}
}

async function ensureIndexes() {
	try {
		// patient_sessions: helpful composite index for therapist/time lookups
		await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_patient_sessions_template_started_completed ON patient_sessions(template_id, started_at, completed_at);`);
		// responses: index by session and answered_at
		await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_responses_session_answered_at ON responses(session_id, answered_at);`);
		// responses: index by question_id for drop-off computations
		await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_responses_question_id ON responses(question_id);`);
		console.log('analytics: ensured base table indexes');
	} catch (e) {
		console.warn('analytics: failed to create indexes', e);
	}
}


let timer: NodeJS.Timeout | null = null;

export function startAnalyticsRollup(intervalSeconds = DEFAULT_INTERVAL) {
	// run immediately then schedule
	void ensureIndexes().catch(() => {});
	void refreshAnalyticsMaterializedViews();
	if (timer) clearInterval(timer);
	timer = setInterval(() => {
		void refreshAnalyticsMaterializedViews();
	}, intervalSeconds * 1000);
	console.log(`analytics: rollup started, interval ${intervalSeconds}s`);
	return timer;
}

export function stopAnalyticsRollup() {
	if (timer) clearInterval(timer);
	timer = null;
}

