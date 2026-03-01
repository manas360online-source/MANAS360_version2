"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySubscriptionsController = exports.createSubscriptionController = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const db_1 = require("../config/db");
const response_1 = require("../utils/response");
const subscription_service_1 = require("../services/subscription.service");
const db = db_1.prisma;
const getAuthUserId = (req) => {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    return userId;
};
const createSubscriptionController = async (req, res) => {
    const userId = getAuthUserId(req);
    const domain = String(req.body.domain ?? '').toUpperCase();
    const plan = String(req.body.plan ?? '').toUpperCase();
    const razorpayPlanId = String(req.body.razorpayPlanId ?? '').trim();
    if (!['PATIENT', 'PROVIDER'].includes(domain)) {
        throw new error_middleware_1.AppError('domain must be PATIENT or PROVIDER', 422);
    }
    if (!['BASIC', 'PREMIUM', 'LEAD_PLAN'].includes(plan)) {
        throw new error_middleware_1.AppError('plan must be BASIC, PREMIUM or LEAD_PLAN', 422);
    }
    if (!razorpayPlanId) {
        throw new error_middleware_1.AppError('razorpayPlanId is required', 422);
    }
    const created = await (0, subscription_service_1.createMarketplaceSubscription)({
        userId,
        domain: domain,
        plan: plan,
        razorpayPlanId,
    });
    (0, response_1.sendSuccess)(res, created, 'Subscription created', 201);
};
exports.createSubscriptionController = createSubscriptionController;
const getMySubscriptionsController = async (req, res) => {
    const userId = getAuthUserId(req);
    const subscriptions = await db.marketplaceSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    (0, response_1.sendSuccess)(res, subscriptions, 'Subscriptions fetched');
};
exports.getMySubscriptionsController = getMySubscriptionsController;
