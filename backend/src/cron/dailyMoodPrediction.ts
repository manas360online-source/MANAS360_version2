import { prisma } from '../config/db';
import { generateMoodPredictionForUser, updateMoodPredictionAccuracy } from '../services/moodPrediction';

const db = prisma as any;

const runJob = async (): Promise<void> => {
	const patients = await db.user.findMany({ where: { role: 'PATIENT', isDeleted: false }, select: { id: true } }).catch(() => []);
	for (const patient of patients) {
		try {
			const moodLogCount = await db.moodLog.count({ where: { userId: patient.id } }).catch(() => 0);
			if (moodLogCount < 7) continue;
			await generateMoodPredictionForUser(patient.id);
			await updateMoodPredictionAccuracy(patient.id);
		} catch (error) {
			console.error('[cron] daily_mood_prediction_failed', { userId: patient.id, error: String(error) });
		}
	}
};

export const startDailyMoodPredictionJob = (): void => {
	const now = new Date();
	const next = new Date(now);
	next.setHours(7, 0, 0, 0);
	if (next.getTime() <= now.getTime()) {
		next.setDate(next.getDate() + 1);
	}
	const delay = next.getTime() - now.getTime();

	setTimeout(() => {
		void runJob();
		setInterval(() => {
			void runJob();
		}, 24 * 60 * 60 * 1000);
	}, delay);

	// Warmup run for newly deployed instances
	void runJob();
};
