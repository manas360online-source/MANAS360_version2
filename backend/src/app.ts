import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import apiRoutes from './routes';
import client from 'prom-client';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

app.use(env.apiPrefix, apiRoutes);

// Prometheus metrics endpoint
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });
app.get('/metrics', async (_req, res) => {
	try {
		const metrics = await client.register.metrics();
		res.set('Content-Type', client.register.contentType);
		res.send(metrics);
	} catch (err) {
		res.status(500).send('metrics error');
	}
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

