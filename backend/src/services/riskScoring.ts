export type PHQ9Severity = 'none' | 'mild' | 'moderate' | 'moderate-severe' | 'severe';
export type GAD7Severity = 'minimal' | 'mild' | 'moderate' | 'severe';

export type PHQ9ScoreResult = {
	total: number;
	severity: PHQ9Severity;
	riskWeight: number;
	q9CrisisFlag: boolean;
	q9Score: number;
};

export type GAD7ScoreResult = {
	total: number;
	severity: GAD7Severity;
	riskWeight: number;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const scorePHQ9 = (answers: number[]): PHQ9ScoreResult => {
	const safe = Array.isArray(answers) ? answers.slice(0, 9).map((value) => clamp(Number(value) || 0, 0, 3)) : [];
	while (safe.length < 9) safe.push(0);
	const total = safe.reduce((sum, value) => sum + value, 0);
	const q9Score = safe[8];
	const q9CrisisFlag = q9Score > 0;

	let severity: PHQ9Severity = 'none';
	let riskWeight = 0.05;

	if (total >= 20) {
		severity = 'severe';
		riskWeight = 0.95;
	} else if (total >= 15) {
		severity = 'moderate-severe';
		riskWeight = 0.75;
	} else if (total >= 10) {
		severity = 'moderate';
		riskWeight = 0.55;
	} else if (total >= 5) {
		severity = 'mild';
		riskWeight = 0.3;
	}

	if (q9CrisisFlag) {
		riskWeight = Math.max(riskWeight, 0.75);
	}

	return { total, severity, riskWeight, q9CrisisFlag, q9Score };
};

export const scoreGAD7 = (answers: number[]): GAD7ScoreResult => {
	const safe = Array.isArray(answers) ? answers.slice(0, 7).map((value) => clamp(Number(value) || 0, 0, 3)) : [];
	while (safe.length < 7) safe.push(0);
	const total = safe.reduce((sum, value) => sum + value, 0);

	let severity: GAD7Severity = 'minimal';
	let riskWeight = 0.05;

	if (total >= 15) {
		severity = 'severe';
		riskWeight = 0.85;
	} else if (total >= 10) {
		severity = 'moderate';
		riskWeight = 0.55;
	} else if (total >= 5) {
		severity = 'mild';
		riskWeight = 0.3;
	}

	return { total, severity, riskWeight };
};
