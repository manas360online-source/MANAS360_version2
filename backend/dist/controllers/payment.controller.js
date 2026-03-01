"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayWebhookController = exports.completeFinancialSessionController = exports.createSessionPaymentController = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const payment_service_1 = require("../services/payment.service");
const subscription_service_1 = require("../services/subscription.service");
const getAuthUserId = (req) => {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new error_middleware_1.AppError('Authentication required', 401);
    }
    return userId;
};
const createSessionPaymentController = async (req, res) => {
    const patientId = getAuthUserId(req);
    const providerId = String(req.body.providerId ?? '').trim();
    const amountMinor = Number(req.body.amountMinor);
    const currency = String(req.body.currency ?? 'INR');
    if (!providerId) {
        throw new error_middleware_1.AppError('providerId is required', 422);
    }
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
        throw new error_middleware_1.AppError('amountMinor must be > 0', 422);
    }
    const result = await (0, payment_service_1.createSessionPayment)({
        patientId,
        providerId,
        amountMinor,
        currency,
    });
    (0, response_1.sendSuccess)(res, result, 'Session payment initiated', 201);
};
exports.createSessionPaymentController = createSessionPaymentController;
const completeFinancialSessionController = async (req, res) => {
    const therapistId = getAuthUserId(req);
    const sessionId = String(req.params.id ?? '').trim();
    if (!sessionId) {
        throw new error_middleware_1.AppError('session id is required', 422);
    }
    await (0, payment_service_1.releaseSessionEarnings)(sessionId, therapistId);
    (0, response_1.sendSuccess)(res, { sessionId }, 'Session earnings released');
};
exports.completeFinancialSessionController = completeFinancialSessionController;
const razorpayWebhookController = async (req, res) => {
    const signature = String(req.headers['x-razorpay-signature'] ?? '');
    if (!signature) {
        throw new error_middleware_1.AppError('Missing x-razorpay-signature', 401);
    }
    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
    const event = req.body;
    const eventType = String(event?.event ?? '');
    const hasSubscriptionEntity = Boolean(event?.payload?.subscription?.entity || event?.payload?.payment?.entity?.subscription);
    let result;
    if (eventType.startsWith('subscription.') || (eventType === 'payment.failed' && hasSubscriptionEntity)) {
        result = await (0, subscription_service_1.processSubscriptionWebhook)(rawBody, signature);
    }
    else {
        result = await (0, payment_service_1.processRazorpayWebhook)(rawBody, signature);
    }
    res.status(200).json({ success: true, ...result });
};
exports.razorpayWebhookController = razorpayWebhookController;
