import 'dotenv/config';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';
import initSocket from './socket';
import { startAnalyticsRollup } from './jobs/analyticsRollup.job';
import './jobs/admin-analytics-export.worker';
import { startDailyMoodPredictionJob } from './cron/dailyMoodPrediction';

const startServer = async (): Promise<void> => {
	await connectDatabase();

	const server = app.listen(env.port, () => {
		console.log(`Server running on port ${env.port}`);
	});

	server.on('error', (error: NodeJS.ErrnoException) => {
		if (error.code === 'EADDRINUSE') {
			console.error(`Port ${env.port} is already in use.`);
			console.error('On macOS this is often ControlCenter (AirPlay Receiver) on port 5000.');
			console.error('Disable AirPlay Receiver in System Settings > General > AirDrop & Handoff, then restart backend.');
			process.exit(1);
		}
	});

	// initialize socket.io (non-blocking)
	void initSocket(server).then(() => console.log('Socket server initialized')).catch((err) => console.error('Socket init failed', err));

	// start analytics rollup job
	void startAnalyticsRollup();
	startDailyMoodPredictionJob();

	const shutdown = async (signal: string): Promise<void> => {
		console.log(`${signal} received. Shutting down gracefully...`);

		server.close(async () => {
			await disconnectDatabase();
			process.exit(0);
		});
	};

	process.on('SIGINT', () => {
		void shutdown('SIGINT');
	});

	process.on('SIGTERM', () => {
		void shutdown('SIGTERM');
	});

	process.on('unhandledRejection', (reason) => {
		console.error('Unhandled Rejection:', reason);
	});

	process.on('uncaughtException', async (error) => {
		console.error('Uncaught Exception:', error);
		await disconnectDatabase();
		process.exit(1);
	});
};

void startServer();

