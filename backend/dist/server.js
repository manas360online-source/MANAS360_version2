"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const socket_1 = __importDefault(require("./socket"));
const analyticsRollup_job_1 = require("./jobs/analyticsRollup.job");
const startServer = async () => {
    await (0, db_1.connectDatabase)();
    const server = app_1.default.listen(env_1.env.port, () => {
        console.log(`Server running on port ${env_1.env.port}`);
    });
    // initialize socket.io (non-blocking)
    void (0, socket_1.default)(server).then(() => console.log('Socket server initialized')).catch((err) => console.error('Socket init failed', err));
    // start analytics rollup job
    void (0, analyticsRollup_job_1.startAnalyticsRollup)();
    const shutdown = async (signal) => {
        console.log(`${signal} received. Shutting down gracefully...`);
        server.close(async () => {
            await (0, db_1.disconnectDatabase)();
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
        await (0, db_1.disconnectDatabase)();
        process.exit(1);
    });
};
void startServer();
