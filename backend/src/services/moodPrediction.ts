import { prisma } from '../config/db';
import { recomputeCompositeRisk } from './compositeRisk';

const db = prisma as any;

type MoodPredictionPoint = {
	date: string;
	predictedMood: number;
	weekday: string;
};

type InfluencingFactors = {
	top_positive_factors: string[];
	top_negative_factors: string[];
	sleep_mood_correlation: string;
	activity_impact: Record<string, string>;
	weekly_pattern: string;
	clinical_note: string;
	fallback_used?: boolean;
};

type TrendDirection = 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'VOLATILE';

type GenerationResult = {
	predictions: MoodPredictionPoint[];
	confidencePct: number;
	trendDirection: TrendDirection;
	deteriorationAlert: boolean;
	influencingFactors: InfluencingFactors;
	insufficientData?: boolean;
	message?: string;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const round = (value: number, digits = 2): number => Number(value.toFixed(digits));

const toDayKey = (date: Date): string => date.toISOString().slice(0, 10);

const weekdayLabel = (date: Date): string => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

const linearRegression = (values: number[]): { slope: number; intercept: number; r2: number } => {
	if (!values.length) return { slope: 0, intercept: 3, r2: 0 };
	const n = values.length;
	const xMean = (n - 1) / 2;
	const yMean = values.reduce((sum, value) => sum + value, 0) / n;
	let numerator = 0;
	let denominator = 0;
	for (let i = 0; i < n; i += 1) {
		numerator += (i - xMean) * (values[i] - yMean);
		denominator += (i - xMean) * (i - xMean);
	}
	const slope = denominator === 0 ? 0 : numerator / denominator;
	const intercept = yMean - slope * xMean;

	let sse = 0;
	let sst = 0;
	for (let i = 0; i < n; i += 1) {
		const predicted = slope * i + intercept;
		sse += (values[i] - predicted) ** 2;
		sst += (values[i] - yMean) ** 2;
	}
	const r2 = sst === 0 ? 1 : clamp(1 - sse / sst, 0, 1);
	return { slope, intercept, r2 };
};

const variance = (values: number[]): number => {
	if (!values.length) return 0;
	const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
	return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
};

const stdDev = (values: number[]): number => Math.sqrt(variance(values));

const classifyTrend = (slope: number, volatility: number): TrendDirection => {
	if (volatility >= 1.8 || (Math.abs(slope) < 0.03 && volatility >= 1.3)) return 'VOLATILE';
	if (slope > 0.05) return 'IMPROVING';
	if (slope < -0.05) return 'DETERIORATING';
	return 'STABLE';
};

const computeConfidencePct = ({
	r2,
	seriesVariance,
	horizonDays,
	dataPoints,
}: {
	r2: number;
	seriesVariance: number;
	horizonDays: number;
	dataPoints: number;
}): number => {
	const baseFromFit = r2 * 100;
	const variancePenalty = Math.sqrt(seriesVariance) * 10;
	const horizonPenalty = horizonDays * 1.5;
	const dataBonus = clamp((dataPoints - 7) * 1.2, 0, 15);
	return round(clamp(baseFromFit - variancePenalty - horizonPenalty + dataBonus, 5, 95), 0);
};

const emptyFactors = (fallback = true): InfluencingFactors => ({
	top_positive_factors: [],
	top_negative_factors: [],
	sleep_mood_correlation: 'insufficient_data',
	activity_impact: {},
	weekly_pattern: 'No clear weekly pattern identified.',
	clinical_note: 'Automated fallback analysis was used due to unavailable Claude analysis.',
	fallback_used: fallback,
});

const parseClaudeJson = (text: string): any => {
	const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
	return JSON.parse(cleaned || '{}');
};

const analyzeInfluencingFactors = async (rows: Array<{ value: number; at: Date; note?: string | null }>): Promise<InfluencingFactors> => {
	const apiKey = process.env.CLAUDE_API_KEY;
	if (!apiKey || !rows.length) return emptyFactors(true);

	const compact = rows.map((row) => ({
		date: toDayKey(row.at),
		mood_score: row.value,
		note: row.note || null,
	}));

	const prompt = `You are a clinical analytics assistant for MANAS360.
Analyze this 30-day mood history and return ONLY JSON with keys:
{
  "top_positive_factors": string[],
  "top_negative_factors": string[],
  "sleep_mood_correlation": string,
  "activity_impact": object,
  "weekly_pattern": string,
  "clinical_note": string
}

If sleep/activity/anxiety details are not explicit in data, state that clearly.
Input mood logs:
${JSON.stringify(compact)}`;

	try {
		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: process.env.CLAUDE_SONNET_MODEL || 'claude-3-5-sonnet-20241022',
				max_tokens: 600,
				temperature: 0,
				messages: [{ role: 'user', content: prompt }],
			}),
		});
		if (!response.ok) return emptyFactors(true);
		const body = (await response.json()) as any;
		const text = Array.isArray(body?.content)
			? body.content.map((part: any) => (part?.type === 'text' ? String(part?.text || '') : '')).join('').trim()
			: '{}';
		const parsed = parseClaudeJson(text);
		return {
			top_positive_factors: Array.isArray(parsed.top_positive_factors) ? parsed.top_positive_factors.map(String) : [],
			top_negative_factors: Array.isArray(parsed.top_negative_factors) ? parsed.top_negative_factors.map(String) : [],
			sleep_mood_correlation: String(parsed.sleep_mood_correlation || 'insufficient_data'),
			activity_impact: typeof parsed.activity_impact === 'object' && parsed.activity_impact ? parsed.activity_impact : {},
			weekly_pattern: String(parsed.weekly_pattern || 'No clear weekly pattern identified.'),
			clinical_note: String(parsed.clinical_note || 'No additional note.'),
			fallback_used: false,
		};
	} catch {
		return emptyFactors(true);
	}
};

export const generateMoodPredictionForUser = async (userId: string): Promise<{
	predictions: MoodPredictionPoint[];
	confidencePct: number;
	trendDirection: TrendDirection;
	deteriorationAlert: boolean;
	influencingFactors: InfluencingFactors;
	insufficientData?: boolean;
	message?: string;
}> => {
	const now = new Date();
	const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	const [moodLogsRaw, patientMoodRaw] = await Promise.all([
		db.moodLog.findMany({
			where: { userId, loggedAt: { gte: fromDate } },
			orderBy: { loggedAt: 'asc' },
			select: { moodValue: true, loggedAt: true, note: true },
		}).catch(() => []),
		db.patientMoodEntry.findMany({
			where: { patient: { userId }, date: { gte: fromDate } },
			orderBy: { date: 'asc' },
			select: { moodScore: true, date: true, note: true },
		}).catch(() => []),
	]);

	const mergedSource = [
		...moodLogsRaw.map((row: any) => ({ value: Number(row.moodValue), at: new Date(row.loggedAt), note: row.note ?? null })),
		...patientMoodRaw.map((row: any) => ({ value: Number(row.moodScore), at: new Date(row.date), note: row.note ?? null })),
	]
		.filter((row) => Number.isFinite(row.value))
		.sort((a, b) => a.at.getTime() - b.at.getTime());

	const byDay = new Map<string, { value: number; at: Date; note?: string | null }>();
	for (const row of mergedSource) {
		byDay.set(toDayKey(row.at), row);
	}
	const merged = [...byDay.values()].sort((a, b) => a.at.getTime() - b.at.getTime());

	const series = merged.map((row) => clamp(row.value, 1, 10));
	if (series.length < 7) {
		return {
			predictions: [],
			confidencePct: 0,
			trendDirection: 'STABLE',
			deteriorationAlert: false,
			influencingFactors: emptyFactors(true),
			insufficientData: true,
			message: 'At least 7 days of mood logs are required for prediction.',
		};
	}

	const { slope, intercept, r2 } = linearRegression(series);

	const byWeekday = new Map<number, number[]>();
	for (const row of merged) {
		const day = row.at.getDay();
		const list = byWeekday.get(day) || [];
		list.push(row.value);
		byWeekday.set(day, list);
	}
	const weekdayOffsets = new Map<number, number>();
	const mean = series.length ? series.reduce((sum, value) => sum + value, 0) / series.length : 3;
	for (const [day, values] of byWeekday.entries()) {
		const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
		weekdayOffsets.set(day, avg - mean);
	}

	const influencingFactors = await analyzeInfluencingFactors(merged);
	const varianceValue = variance(series);
	const volatility = stdDev(series);
	const trendDirection = classifyTrend(slope, volatility);
	const confidencePct = computeConfidencePct({ r2, seriesVariance: varianceValue, horizonDays: 7, dataPoints: series.length });

	const predictions: MoodPredictionPoint[] = [];
	for (let i = 1; i <= 7; i += 1) {
		const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
		const x = series.length + i - 1;
		const base = slope * x + intercept;
		const seasonal = weekdayOffsets.get(date.getDay()) || 0;
		const predictedMood = clamp(base + seasonal, 1, 10);
		predictions.push({ date: date.toISOString(), predictedMood: round(predictedMood), weekday: weekdayLabel(date) });
	}
	const deteriorationAlert = trendDirection === 'DETERIORATING' && predictions.some((row) => row.predictedMood <= 3);
	const [day1, day2, day3, day4, day5, day6, day7] = predictions.map((point) => point.predictedMood);
	const runDate = new Date(now);
	runDate.setHours(0, 0, 0, 0);

	for (let i = 0; i < predictions.length; i += 1) {
		const point = predictions[i];
		const predictionDate = new Date(point.date);
		const basePayload = {
			predictedMood: point.predictedMood,
			confidencePct,
			trendDirection,
			deteriorationAlert,
			factorAnalysis: influencingFactors,
		};

		const enrichedPayload = {
			...basePayload,
			day1Predicted: day1,
			day2Predicted: day2,
			day3Predicted: day3,
			day4Predicted: day4,
			day5Predicted: day5,
			day6Predicted: day6,
			day7Predicted: day7,
			influencingFactors,
			batchDate: runDate,
		};

		try {
			await db.moodPrediction.upsert({
				where: { userId_predictionDate: { userId, predictionDate } },
				update: i === 0 ? enrichedPayload : basePayload,
				create: {
					userId,
					predictionDate,
					...(i === 0 ? enrichedPayload : basePayload),
				},
			});
		} catch {
			await db.moodPrediction.upsert({
				where: { userId_predictionDate: { userId, predictionDate } },
				update: basePayload,
				create: { userId, predictionDate, ...basePayload },
			}).catch(() => undefined);
		}
	}

	if (deteriorationAlert && predictions.some((row) => row.predictedMood <= 3)) {
		void recomputeCompositeRisk({ userId, source: 'mood_prediction_deterioration' }).catch((error) => {
			console.error('[risk] recompute_from_prediction_failed', { userId, error: String(error) });
		});
	}

	return { predictions, confidencePct, trendDirection, deteriorationAlert, influencingFactors };
};

export const updateMoodPredictionAccuracy = async (userId: string): Promise<{ mae: number; within2Pct: number; totalEvaluated: number }> => {
	const [predictions, moodLogs] = await Promise.all([
		db.moodPrediction.findMany({ where: { userId, predictionDate: { lte: new Date() } }, orderBy: { predictionDate: 'asc' } }).catch(() => []),
		db.moodLog.findMany({ where: { userId }, select: { moodValue: true, loggedAt: true } }).catch(() => []),
	]);

	const actualByDate = new Map<string, number>();
	for (const row of moodLogs) {
		const key = new Date(row.loggedAt).toISOString().slice(0, 10);
		actualByDate.set(key, Number(row.moodValue));
	}

	let totalAbsError = 0;
	let count = 0;
	let within2 = 0;

	for (const prediction of predictions) {
		const key = new Date(prediction.predictionDate).toISOString().slice(0, 10);
		const actual = actualByDate.get(key);
		if (actual === undefined) continue;
		const absError = Math.abs(Number(prediction.predictedMood) - actual);
		totalAbsError += absError;
		count += 1;
		if (absError <= 2) within2 += 1;
		await db.moodPrediction.update({
			where: { id: prediction.id },
			data: {
				actualMood: actual,
				maeSnapshot: count ? totalAbsError / count : 0,
				accuracyWithin2Pct: count ? (within2 / count) * 100 : 0,
			},
		});
	}

	return {
		mae: count ? round(totalAbsError / count, 4) : 0,
		within2Pct: count ? round((within2 / count) * 100, 2) : 0,
		totalEvaluated: count,
	};
};
