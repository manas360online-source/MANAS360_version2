import { prisma } from '../config/db';

const db = prisma as any;

const crisisKeywords = [
	'kill myself',
	'end my life',
	'suicide',
	'self harm',
	'want to die',
	'hurt myself',
	'marna chahta',
	'zindagi khatam',
	'jeena nahi',
	'aatmahatya',
];

export const detectCrisisSignal = (message: string): boolean => {
	const normalized = String(message || '').toLowerCase();
	if (!normalized) return false;
	return crisisKeywords.some((keyword) => normalized.includes(keyword));
};

export const getCrisisSupportResponse = (): string =>
	"I'm really glad you reached out. You deserve immediate support right now. Please contact your local emergency services or a suicide prevention helpline immediately. If you're in India, call Tele-MANAS at 14416 or 1-800-891-4416. If you can, reach out to a trusted person near you right now.";

export const triggerCrisisEscalation = async (
	userId: string,
	botType: 'mood_ai' | 'clinical_ai',
	message: string,
): Promise<void> => {
	try {
		await db.notification.create({
			data: {
				userId,
				type: 'CRISIS_ALERT',
				title: 'Crisis signal detected',
				message: `Potential crisis language detected in ${botType} conversation.`,
				payload: {
					botType,
					messagePreview: String(message || '').slice(0, 500),
					detectedAt: new Date().toISOString(),
				},
			},
		});
	} catch {
		// fail-safe: never block user response on escalation persistence failure
	}
};
