"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const error_middleware_1 = require("./middleware/error.middleware");
const logger_middleware_1 = require("./middleware/logger.middleware");
const routes_1 = __importDefault(require("./routes"));
const prom_client_1 = __importDefault(require("prom-client"));
const app = (0, express_1.default)();
app.disable('x-powered-by');
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.corsOrigin,
    credentials: true,
}));
app.use(express_1.default.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
        req.rawBody = buf.toString('utf8');
    },
}));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use(logger_middleware_1.requestLogger);
app.use(env_1.env.apiPrefix, routes_1.default);
// Prometheus metrics endpoint
const collectDefaultMetrics = prom_client_1.default.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });
app.get('/metrics', async (_req, res) => {
    try {
        const metrics = await prom_client_1.default.register.metrics();
        res.set('Content-Type', prom_client_1.default.register.contentType);
        res.send(metrics);
    }
    catch (err) {
        res.status(500).send('metrics error');
    }
});
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
exports.default = app;
