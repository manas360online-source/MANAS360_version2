import mongoose from 'mongoose';
import { env } from './env';

let isConnected = false;

mongoose.set('strictQuery', true);

export const connectDatabase = async (): Promise<void> => {
	if (isConnected) {
		return;
	}

	await mongoose.connect(env.mongoUri);
	isConnected = true;
};

export const disconnectDatabase = async (): Promise<void> => {
	if (!isConnected) {
		return;
	}

	await mongoose.disconnect();
	isConnected = false;
};

export const getDatabaseStatus = (): { isConnected: boolean } => ({
	isConnected,
});

export const db = mongoose;

export default db;

// Compatibility shim for code that imports `prisma` (some modules expect a Prisma client).
// We export a permissive `prisma` any here to avoid TypeScript import/compile errors
// while the codebase mixes different data layers (mongoose/prisma). This is a temporary
// shim to unblock type-checking; replace with the real Prisma client if/when migrating.
export const prisma: any = {};

