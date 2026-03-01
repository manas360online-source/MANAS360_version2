"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = exports.AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
const error_middleware_1 = require("../middleware/error.middleware");
const parseRange = (req) => {
    const from = String(req.query.from || req.body.from || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString());
    const to = String(req.query.to || req.body.to || new Date().toISOString());
    return { from, to };
};
class AnalyticsController {
    async getSummary(req, res) {
        try {
            const userId = req.auth?.userId;
            if (!userId)
                throw new error_middleware_1.AppError('Authentication required', 401);
            const range = parseRange(req);
            const data = await analytics_service_1.analyticsService.getSummary(userId, range);
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }
    async getTimeSeries(req, res) {
        try {
            const userId = req.auth?.userId;
            if (!userId)
                throw new error_middleware_1.AppError('Authentication required', 401);
            const range = parseRange(req);
            const gran = String(req.query.granularity || 'week');
            const data = await analytics_service_1.analyticsService.getTimeSeries(userId, range, gran);
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }
    async getDropOff(req, res) {
        try {
            const userId = req.auth?.userId;
            if (!userId)
                throw new error_middleware_1.AppError('Authentication required', 401);
            const range = parseRange(req);
            const templateId = req.query.templateId ? String(req.query.templateId) : undefined;
            const data = await analytics_service_1.analyticsService.getDropOff(userId, range, templateId);
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }
}
exports.AnalyticsController = AnalyticsController;
exports.analyticsController = new AnalyticsController();
