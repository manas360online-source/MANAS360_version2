import { prisma } from '../config/db';
import { computeBehavioralSignals } from './behavioralPatterns';
import { scoreGAD7, scorePHQ9 } from './riskScoring';
import { triggerCrisisEscalationWorkflow } from './crisisEscalation';

const db = prisma as any;

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

export const classifyRiskLevel = (score: number): RiskLevel => {
	if (score >= 0.8) return 'CRITICAL';
	if (score >= 0.55) return 'HIGH';
	if (score >= 0.3) return 'MEDIUM';
	return 'LOW';
};

export const computeCompositeRisk = (input: {
	phq9: number;
	gad7: number;
	chat: number;
	behavioral: number;
	q9Score?: number;
	chatCrisisIntent?: boolean;
	chatUrgency?: string;
}): { compositeScore: number; riskLevel: RiskLevel; overrideReasons: string[] } => {
	const base =
		0.35 * clamp(input.phq9) +
		0.15 * clamp(input.gad7) +
		0.3 * clamp(input.chat) +
		0.2 * clamp(input.behavioral);

	const overrideReasons: string[] = [];
	let riskLevel = classifyRiskLevel(base);

	if (Number(input.q9Score || 0) > 0 && ['LOW', 'MEDIUM'].includes(riskLevel)) {
		riskLevel = 'HIGH';
		overrideReasons.push('PHQ-9 Q9 > 0');
	}
	if (Number(input.q9Score || 0) === 3) {
		riskLevel = 'CRITICAL';
		overrideReasons.push('PHQ-9 Q9 = 3');
	}
	if (input.chatCrisisIntent) {
		riskLevel = 'CRITICAL';
		overrideReasons.push('Chat crisis_intent = true');
	}
	if (String(input.chatUrgency || '').toUpperCase() === 'CRITICAL') {
		riskLevel = 'CRITICAL';
		overrideReasons.push('Chat urgency = critical');
	}

	return { compositeScore: clamp(base), riskLevel, overrideReasons };
};

const toPhqComponent = async (userId: string): Promise<{ value: number; q9Score: number }> => {
	const latestPhq = await db.pHQ9Assessment.findFirst({ where: { userId }, orderBy: { assessedAt: 'desc' } }).catch(() => null);
	if (latestPhq) {
		return { value: clamp(Number(latestPhq.riskWeight || 0)), q9Score: Number(latestPhq.q9Score || 0) };
	}

	const legacy = await db.patientAssessment.findFirst({ where: { patient: { userId }, type: 'PHQ-9' }, orderBy: { createdAt: 'desc' } }).catch(() => null);
	if (!legacy) return { value: 0.05, q9Score: 0 };
	const scored = scorePHQ9(Array.isArray(legacy.answers) ? legacy.answers : []);
	return { value: scored.riskWeight, q9Score: scored.q9Score };
};

const toGadComponent = async (userId: string): Promise<number> => {
	const latest = await db.gAD7Assessment.findFirst({ where: { userId }, orderBy: { assessedAt: 'desc' } }).catch(() => null);
	if (latest) return clamp(Number(latest.riskWeight || 0));
	const legacy = await db.patientAssessment.findFirst({ where: { patient: { userId }, type: 'GAD-7' }, orderBy: { createdAt: 'desc' } }).catch(() => null);
	if (!legacy) return 0.05;
	return scoreGAD7(Array.isArray(legacy.answers) ? legacy.answers : []).riskWeight;
};

const toChatComponent = async (userId: string): Promise<{ value: number; crisisIntent: boolean; urgency: string }> => {
	const latest = await db.chatAnalysis.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => null);
	if (!latest) return { value: 0.05, crisisIntent: false, urgency: 'LOW' };
	return {
		value: clamp(Number(latest.crisisRisk || 0)),
		crisisIntent: Boolean(latest.crisisIntent),
		urgency: String(latest.urgencyLevel || 'LOW').toUpperCase(),
	};
};

export const recomputeCompositeRisk = async (input: { userId: string; source?: string }): Promise<{
	riskScoreId: string;
	compositeScore: number;
	riskLevel: RiskLevel;
}> => {
	const [phq, gad, chat, behavior] = await Promise.all([
		toPhqComponent(input.userId),
		toGadComponent(input.userId),
		toChatComponent(input.userId),
		computeBehavioralSignals(input.userId),
	]);

	const computed = computeCompositeRisk({
		phq9: phq.value,
		gad7: gad,
		chat: chat.value,
		behavioral: behavior.behavioralComposite,
		q9Score: phq.q9Score,
		chatCrisisIntent: chat.crisisIntent,
		chatUrgency: chat.urgency,
	});

	const record = await db.riskScore.create({
		data: {
			userId: input.userId,
			phq9Component: phq.value,
			gad7Component: gad,
			chatComponent: chat.value,
			behavioralComponent: behavior.behavioralComposite,
			compositeScore: computed.compositeScore,
			riskLevel: computed.riskLevel,
			source: input.source || 'system',
			metadata: {
				overrideReasons: computed.overrideReasons,
				behavioralSignals: behavior,
				chatUrgency: chat.urgency,
			},
		},
	});

	if (['HIGH', 'CRITICAL'].includes(computed.riskLevel)) {
		await triggerCrisisEscalationWorkflow({
			userId: input.userId,
			riskScoreId: record.id,
			riskLevel: computed.riskLevel,
			reason: computed.overrideReasons.join(' | ') || 'Composite risk threshold exceeded',
		});
	}

	return { riskScoreId: record.id, compositeScore: computed.compositeScore, riskLevel: computed.riskLevel };
};
