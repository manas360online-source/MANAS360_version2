import { randomUUID } from 'crypto';
import {
	connectTestDb,
	disconnectTestDb,
	prisma,
	resetTestDb,
	withRollbackTransaction,
} from '../helpers/postgres-fixture';

describe('PostgreSQL fixture harness', () => {
	beforeAll(async () => {
		await connectTestDb();
		await resetTestDb();
	});

	afterAll(async () => {
		await resetTestDb();
		await disconnectTestDb();
	});

	it('uses interactive transaction rollback for fixture writes', async () => {
		const email = `rollback-${randomUUID()}@test.local`;
		const id = randomUUID();

		await withRollbackTransaction(async (tx) => {
			await tx.$executeRawUnsafe(
				`INSERT INTO "users" ("id", "email", "firstName", "lastName", "role", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5::"UserRole", NOW(), NOW())`,
				id,
				email,
				'Tx',
				'Rollback',
				'PATIENT',
			);

			const inside = (await tx.$queryRawUnsafe(
				`SELECT "id" FROM "users" WHERE "email" = $1 LIMIT 1`,
				email,
			)) as Array<{ id: string }>;
			expect(inside.length).toBe(1);
		});

		const outside = (await prisma.$queryRawUnsafe(
			`SELECT "id" FROM "users" WHERE "email" = $1 LIMIT 1`,
			email,
		)) as Array<{ id: string }>;
		expect(outside.length).toBe(0);
	});

	it('supports deterministic schema reset between tests', async () => {
		await prisma.$executeRawUnsafe(
			`INSERT INTO "users" ("id", "email", "firstName", "lastName", "role", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5::"UserRole", NOW(), NOW())`,
			randomUUID(),
			`reset-${randomUUID()}@test.local`,
			'Reset',
			'Case',
			'PATIENT',
		);

		const beforeReset = (await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "users"`)) as Array<{
			count: number;
		}>;
		expect(beforeReset[0].count).toBeGreaterThan(0);

		await resetTestDb();

		const afterReset = (await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "users"`)) as Array<{
			count: number;
		}>;
		expect(afterReset[0].count).toBe(0);
	});
});
