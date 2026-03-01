import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL = 'postgresql://chandu@localhost:5432/manas360_dev';
}

export const prisma = new PrismaClient();

const RESET_TABLES = [
	'webhook_logs',
	'wallet_transactions',
	'revenue_ledger',
	'subscription_invoices',
	'marketplace_subscriptions',
	'payout_requests',
	'financial_payments',
	'financial_sessions',
	'provider_wallets',
	'therapy_sessions',
	'patient_session_responses',
	'patient_sessions',
	'patient_assessments',
	'patient_mood_entries',
	'patient_profiles',
	'auth_sessions',
	'auth_audit_logs',
	'users',
];

export const connectTestDb = async (): Promise<void> => {
	await prisma.$connect();
};

export const disconnectTestDb = async (): Promise<void> => {
	await prisma.$disconnect();
};

export const resetTestDb = async (): Promise<void> => {
	const existing = (await prisma.$queryRawUnsafe(
		`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
	)) as Array<{ tablename: string }>;

	const existingSet = new Set(existing.map((row) => row.tablename));
	const available = RESET_TABLES.filter((name) => existingSet.has(name));

	if (available.length === 0) {
		return;
	}

	const quoted = available.map((name) => `"${name}"`).join(', ');
	await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
};

export const withRollbackTransaction = async <T>(run: (tx: any) => Promise<T>): Promise<void> => {
	class RollbackMarker extends Error {
		constructor() {
			super('ROLLBACK_MARKER');
		}
	}

	try {
		await prisma.$transaction(async (tx) => {
			await run(tx as any);
			throw new RollbackMarker();
		});
	} catch (error) {
		if (!(error instanceof RollbackMarker)) {
			throw error;
		}
	}
};
