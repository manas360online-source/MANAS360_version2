"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayPaymentSignature = exports.verifyRazorpayWebhookSignature = exports.createRazorpaySubscription = exports.createRazorpayOrder = void 0;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';
const getAuthHeader = () => {
    if (!env_1.env.razorpayKeyId || !env_1.env.razorpayKeySecret) {
        throw new Error('Razorpay credentials are not configured');
    }
    return `Basic ${Buffer.from(`${env_1.env.razorpayKeyId}:${env_1.env.razorpayKeySecret}`).toString('base64')}`;
};
const parseJsonOrThrow = async (response) => {
    const raw = await response.text();
    const parsed = raw ? JSON.parse(raw) : {};
    if (!response.ok) {
        throw new Error(parsed?.error?.description ?? `Razorpay API error (${response.status})`);
    }
    return parsed;
};
const createRazorpayOrder = async (input) => {
    const response = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            Authorization: getAuthHeader(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount: input.amountMinor,
            currency: input.currency,
            receipt: input.receipt,
            notes: input.notes,
        }),
    });
    return parseJsonOrThrow(response);
};
exports.createRazorpayOrder = createRazorpayOrder;
const createRazorpaySubscription = async (input) => {
    const response = await fetch(`${RAZORPAY_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: {
            Authorization: getAuthHeader(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            plan_id: input.planId,
            total_count: input.totalCount ?? 120,
            quantity: input.quantity ?? 1,
            notes: input.notes,
        }),
    });
    return parseJsonOrThrow(response);
};
exports.createRazorpaySubscription = createRazorpaySubscription;
const verifyRazorpayWebhookSignature = (rawBody, receivedSignature, secret) => {
    const digest = crypto_1.default.createHmac('sha256', secret).update(rawBody).digest('hex');
    const digestBuf = Buffer.from(digest, 'utf8');
    const sigBuf = Buffer.from(receivedSignature, 'utf8');
    if (digestBuf.length !== sigBuf.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(digestBuf, sigBuf);
};
exports.verifyRazorpayWebhookSignature = verifyRazorpayWebhookSignature;
const verifyRazorpayPaymentSignature = (razorpayOrderId, razorpayPaymentId, receivedSignature, secret) => {
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const digest = crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
    const digestBuf = Buffer.from(digest, 'utf8');
    const sigBuf = Buffer.from(receivedSignature, 'utf8');
    if (digestBuf.length !== sigBuf.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(digestBuf, sigBuf);
};
exports.verifyRazorpayPaymentSignature = verifyRazorpayPaymentSignature;
