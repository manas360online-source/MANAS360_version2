import { PrismaClient } from '@prisma/client';
import { env } from './env';

let isConnected = false;

export const prisma = new PrismaClient();

export const connectDatabase = async (): Promise<void> => {
	if (isConnected) return;
	// Prisma connects lazily; a simple test query ensures the client can connect
	if (env.databaseUrl) {
		await prisma.$connect();
	}
	isConnected = true;
};

export const disconnectDatabase = async (): Promise<void> => {
	if (!isConnected) return;
	await prisma.$disconnect();
	isConnected = false;
};

export const getDatabaseStatus = (): { isConnected: boolean } => ({ isConnected });

export default prisma;

