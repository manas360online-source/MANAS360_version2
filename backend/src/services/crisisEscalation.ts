import { prisma } from '../config/db';

const db = prisma as any;

type TriggerInput = {
	userId: string;
	riskScoreId?: string;
	riskLevel: 'HIGH' | 'CRITICAL' | string;
	reason?: string;
};

const providerRoles = ['THERAPIST', 'PSYCHIATRIST', 'COACH'];

const findRelatedProviders = async (userId: string): Promise<Array<{ id: string; role: string }>> => {
	const recentSessions = await db.therapySession.findMany({
		where: { patientProfile: { userId } },
		orderBy: { dateTime: 'desc' },
		take: 20,
		select: { therapistProfileId: true },
	}).catch(() => []);

	const providerIds = [...new Set(recentSessions.map((row: any) => String(row.therapistProfileId || '')).filter(Boolean))];
	if (!providerIds.length) return [];

	const users = await db.user.findMany({
		where: {
			id: { in: providerIds },
			role: { in: providerRoles },
			isDeleted: false,
		},
		select: { id: true, role: true },
	}).catch(() => []);

	return users.map((row: any) => ({ id: row.id, role: String(row.role || 'THERAPIST') }));
};

const findBackupTherapist = async (excludeProviderIds: string[] = []): Promise<string | null> => {
	const backup = await db.user.findFirst({
		where: {
			role: { in: providerRoles },
			isDeleted: false,
			...(excludeProviderIds.length ? { id: { notIn: excludeProviderIds } } : {}),
		},
		orderBy: { createdAt: 'asc' },
		select: { id: true },
	}).catch(() => null);
	return backup?.id || null;
};

const createInAppAlert = async (userId: string, type: string, title: string, message: string, payload?: any) => {
	await db.notification.create({
		data: { userId, type, title, message, payload: payload || {} },
	});
};

export const triggerCrisisEscalationWorkflow = async (input: TriggerInput): Promise<string> => {
	const now = new Date();
	const relatedProviders = await findRelatedProviders(input.userId);
	const primaryProviderId = relatedProviders[0]?.id || null;
	const backupTherapistId = await findBackupTherapist(relatedProviders.map((provider) => provider.id));

	const escalation = await db.crisisEscalation.create({
		data: {
			userId: input.userId,
			riskScoreId: input.riskScoreId || null,
			riskLevel: input.riskLevel,
			reason: input.reason || 'Safety threshold crossed',
			status: 'OPEN',
			opsAlertedAt: now,
			patientShownAt: now,
			therapistAlertedAt: primaryProviderId ? now : null,
			therapistId: primaryProviderId,
			backupTherapistId,
			payload: {
				sla: {
					opsAlertSec: 30,
					patientAlertSec: 30,
					therapistAlertSec: 60,
					backupEscalationSec: 600,
				},
				relatedProviders,
			},
		},
	});

	// Tier 1: Patient
	await createInAppAlert(
		input.userId,
		'PATIENT_CRISIS_SUPPORT',
		'Immediate support recommended',
		'Please reach immediate support. In India, call Tele-MANAS at 14416 or 1-800-891-4416.',
		{ escalationId: escalation.id, channel: ['in-app-modal', 'sms'] },
	).catch(() => undefined);

	// Tier 2: Related care providers (therapist / psychiatrist / coach)
	if (relatedProviders.length) {
		await Promise.all(
			relatedProviders.map((provider) =>
				createInAppAlert(
					provider.id,
					'PROVIDER_CRISIS_ALERT',
					'Patient needs urgent attention',
					`Please review crisis escalation ${escalation.id} immediately.`,
					{
						escalationId: escalation.id,
						providerRole: provider.role,
						channel: ['sms', 'push', 'in-app'],
					},
				),
			),
		).catch(() => undefined);
	}

	// Tier 3: Backup therapist if not acknowledged in 10 minutes
	if (backupTherapistId) {
		setTimeout(() => {
			void (async () => {
				const latest = await db.crisisEscalation.findUnique({ where: { id: escalation.id } }).catch(() => null);
				if (!latest || latest.therapistAckAt || latest.status !== 'OPEN') return;
				await db.crisisEscalation.update({
					where: { id: escalation.id },
					data: { backupAlertedAt: new Date() },
				});
				await createInAppAlert(
					backupTherapistId,
					'BACKUP_THERAPIST_CRISIS_ALERT',
					'Backup escalation required',
					`Backup intervention required for escalation ${escalation.id}.`,
					{ escalationId: escalation.id, channel: ['voice-auto-dial', 'in-app'] },
				).catch(() => undefined);
				console.warn('[crisis] backup_escalation_dispatched', { escalationId: escalation.id, channel: 'voice-auto-dial' });
			})();
		}, 10 * 60 * 1000);
	}

	return escalation.id;
};

export const acknowledgeEscalation = async (id: string, therapistId: string): Promise<void> => {
	await db.crisisEscalation.update({
		where: { id },
		data: { therapistAckAt: new Date(), therapistId, status: 'ACKNOWLEDGED' },
	});
};

export const resolveEscalation = async (id: string): Promise<void> => {
	await db.crisisEscalation.update({ where: { id }, data: { status: 'RESOLVED' } });
};
