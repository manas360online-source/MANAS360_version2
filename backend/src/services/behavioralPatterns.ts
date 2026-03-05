import { prisma } from '../config/db';

const db = prisma as any;

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const daysBetween = (a: Date, b: Date): number => Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);

export type BehavioralSignalsResult = {
	login_gap: number;
	session_no_show: number;
	mood_log_gap: number;
	mood_decline: number;
	phq9_worsening: number;
	late_night_activity: number;
	behavioralComposite: number;
};

export const computeBehavioralSignals = async (userId: string): Promise<BehavioralSignalsResult> => {
	const now = new Date();

	const [lastSession, therapySessions, moodLogsRaw, patientMoodRaw, phq9Rows, authRows] = await Promise.all([
		db.authSession.findFirst({ where: { userId }, orderBy: { lastActiveAt: 'desc' }, select: { lastActiveAt: true } }).catch(() => null),
		db.therapySession.findMany({
			where: {
				patientProfile: { userId },
				dateTime: { lte: now },
			},
			orderBy: { dateTime: 'desc' },
			take: 12,
			select: { status: true },
		}).catch(() => []),
		db.moodLog.findMany({ where: { userId }, orderBy: { loggedAt: 'desc' }, take: 12, select: { moodValue: true, loggedAt: true } }).catch(() => []),
		db.patientMoodEntry.findMany({ where: { patient: { userId } }, orderBy: { date: 'desc' }, take: 12, select: { moodScore: true, date: true } }).catch(() => []),
		db.pHQ9Assessment.findMany({ where: { userId }, orderBy: { assessedAt: 'desc' }, take: 3, select: { totalScore: true } }).catch(() => []),
		db.authSession.findMany({ where: { userId, lastActiveAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } }, select: { lastActiveAt: true } }).catch(() => []),
	]);

	const loginGapDays = lastSession?.lastActiveAt ? daysBetween(lastSession.lastActiveAt, now) : 30;
	const login_gap = clamp(loginGapDays / 14);

	const noShowCount = therapySessions.filter((row: any) => ['CANCELLED', 'ABANDONED'].includes(String(row.status || '').toUpperCase())).length;
	const session_no_show = clamp(therapySessions.length ? noShowCount / therapySessions.length : 0);

	const unifiedMoodLogs = [
		...moodLogsRaw.map((row: any) => ({ value: Number(row.moodValue), at: new Date(row.loggedAt) })),
		...patientMoodRaw.map((row: any) => ({ value: Number(row.moodScore), at: new Date(row.date) })),
	]
		.sort((a, b) => b.at.getTime() - a.at.getTime())
		.slice(0, 12);

	const moodGapDays = unifiedMoodLogs[0] ? daysBetween(unifiedMoodLogs[0].at, now) : 30;
	const mood_log_gap = clamp(moodGapDays / 14);

	const recent = unifiedMoodLogs.slice(0, 3).map((row) => row.value);
	const previous = unifiedMoodLogs.slice(3, 6).map((row) => row.value);
	const recentAvg = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : 3;
	const prevAvg = previous.length ? previous.reduce((sum, value) => sum + value, 0) / previous.length : recentAvg;
	const mood_decline = clamp((prevAvg - recentAvg) / 2);

	const phqLatest = Number(phq9Rows[0]?.totalScore || 0);
	const phqPrevious = Number(phq9Rows[1]?.totalScore || phqLatest);
	const phq9_worsening = clamp((phqLatest - phqPrevious) / 10);

	const lateNightCount = authRows.filter((row: any) => {
		const hour = new Date(row.lastActiveAt).getHours();
		return hour >= 0 && hour <= 4;
	}).length;
	const late_night_activity = clamp(authRows.length ? lateNightCount / authRows.length : 0);

	const behavioralComposite = clamp(
		(login_gap + session_no_show + mood_log_gap + mood_decline + phq9_worsening + late_night_activity) / 6,
	);

	return {
		login_gap,
		session_no_show,
		mood_log_gap,
		mood_decline,
		phq9_worsening,
		late_night_activity,
		behavioralComposite,
	};
};
