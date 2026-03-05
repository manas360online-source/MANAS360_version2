import { prisma } from '../config/db';
import { acknowledgeEscalation, resolveEscalation } from './crisisEscalation';
import { generateMoodPredictionForUser, updateMoodPredictionAccuracy } from './moodPrediction';
import { recomputeCompositeRisk } from './compositeRisk';

const db = prisma as any;

export const getCurrentRisk = async (userId: string) => {
	const current = await db.riskScore.findFirst({ where: { userId }, orderBy: { evaluatedAt: 'desc' } });
	if (current) return current;
	const recomputed = await recomputeCompositeRisk({ userId, source: 'api_current_risk' });
	return db.riskScore.findUnique({ where: { id: recomputed.riskScoreId } });
};

export const getRiskHistory = async (userId: string) =>
	db.riskScore.findMany({ where: { userId }, orderBy: { evaluatedAt: 'desc' }, take: 100 });

export const getMoodPrediction = async (userId: string) => {
	const latest = await db.moodPrediction.findMany({ where: { userId, predictionDate: { gte: new Date() } }, orderBy: { predictionDate: 'asc' }, take: 7 });
	if (latest.length) {
		return {
			predictions: latest.map((row: any) => ({
				date: row.predictionDate,
				predictedMood: Number(row.predictedMood || 0),
				weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(row.predictionDate).getDay()],
			})),
			confidencePct: Number(latest[0].confidencePct || 0),
			trendDirection: String(latest[0].trendDirection || 'STABLE'),
			deteriorationAlert: Boolean(latest[0].deteriorationAlert),
			influencingFactors: latest[0].influencingFactors || latest[0].factorAnalysis || null,
		};
	}
	return generateMoodPredictionForUser(userId);
};

export const getMoodHistory = async (userId: string) => {
	const [moodLogs, patientMoodEntries] = await Promise.all([
		db.moodLog.findMany({ where: { userId }, orderBy: { loggedAt: 'desc' }, take: 120 }).catch(() => []),
		db.patientMoodEntry.findMany({ where: { patient: { userId } }, orderBy: { date: 'desc' }, take: 120 }).catch(() => []),
	]);

	return {
		mood_logs: moodLogs,
		legacy_mood_entries: patientMoodEntries,
	};
};

export const getMoodAccuracy = async (userId: string) => {
	const accuracy = await updateMoodPredictionAccuracy(userId);
	const latestRows = await db.moodPrediction.findMany({ where: { userId }, orderBy: { predictionDate: 'desc' }, take: 30 });
	return {
		...accuracy,
		targetWithin2Pct: 75,
		targetMet: Number(accuracy.within2Pct || 0) >= 75,
		recent: latestRows,
	};
};

export const getOpenEscalations = async () =>
	db.crisisEscalation.findMany({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } }, orderBy: { createdAt: 'desc' }, take: 200 });

export const acknowledgeEscalationById = async (id: string, therapistId: string) => {
	await acknowledgeEscalation(id, therapistId);
	return db.crisisEscalation.findUnique({ where: { id } });
};

export const resolveEscalationById = async (id: string) => {
	await resolveEscalation(id);
	return db.crisisEscalation.findUnique({ where: { id } });
};
