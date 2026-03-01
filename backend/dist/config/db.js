"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseStatus = exports.disconnectDatabase = exports.connectDatabase = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const env_1 = require("./env");
let isConnected = false;
exports.prisma = new client_1.PrismaClient();
const connectDatabase = async () => {
    if (isConnected)
        return;
    // Prisma connects lazily; a simple test query ensures the client can connect
    if (env_1.env.databaseUrl) {
        await exports.prisma.$connect();
    }
    isConnected = true;
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    if (!isConnected)
        return;
    await exports.prisma.$disconnect();
    isConnected = false;
};
exports.disconnectDatabase = disconnectDatabase;
const getDatabaseStatus = () => ({ isConnected });
exports.getDatabaseStatus = getDatabaseStatus;
exports.default = exports.prisma;
