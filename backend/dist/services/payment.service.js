"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseSessionEarnings = exports.processRazorpayWebhook = exports.createSessionPayment = void 0;
const crypto_1 = __importStar(require("crypto"));
const redis_1 = require("redis");
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const razorpay_service_1 = require("./razorpay.service");
const redis = (0, redis_1.createClient)({ url: env_1.env.redisUrl });
redis.on('error', (error) => {
    console.warn('[payment.service] Redis unavailable, continuing with degraded idempotency cache', error);
});
void redis.connect().catch(() => undefined);
const db = db_1.prisma;
const asMinor = (value) => Math.max(0, Math.round(value));
const sha256 = (input) => crypto_1.default.createHash('sha256').update(input).digest('hex');
const providerShareRatio = env_1.env.paymentProviderSharePercent / 100;
const platformShareRatio = env_1.env.paymentPlatformSharePercent / 100;
if (Math.round((providerShareRatio + platformShareRatio) * 100) !== 100) {
    throw new Error('PAYMENT_PROVIDER_SHARE_PERCENT + PAYMENT_PLATFORM_SHARE_PERCENT must equal 100');
}
const assertPaymentActors = async (tx, patientId, providerId) => {
    if (patientId === providerId) {
        throw new error_middleware_1.AppError('patientId and providerId must be different', 422);
    }
    const [patient, provider] = await Promise.all([
        tx.user.findUnique({ where: { id: patientId }, select: { id: true, role: true, isDeleted: true } }),
        tx.user.findUnique({ where: { id: providerId }, select: { id: true, role: true, isDeleted: true } }),
    ]);
    if (!patient || patient.isDeleted || String(patient.role) !== 'PATIENT') {
        throw new error_middleware_1.AppError('Invalid patient account', 422);
    }
    if (!provider || provider.isDeleted || String(provider.role) !== 'THERAPIST') {
        throw new error_middleware_1.AppError('Invalid provider account', 422);
    }
};
const createSessionPayment = async (input) => {
    const amountMinor = asMinor(input.amountMinor);
    if (!amountMinor) {
        throw new error_middleware_1.AppError('amountMinor must be greater than zero', 422);
    }
    const idempotencyKey = (0, crypto_1.randomUUID)();
    const receipt = `sess_${Date.now()}_${idempotencyKey.slice(0, 8)}`;
    const order = await (0, razorpay_service_1.createRazorpayOrder)({
        amountMinor,
        currency: input.currency ?? 'INR',
        receipt,
        notes: {
            patientId: input.patientId,
            providerId: input.providerId,
        },
    });
    const created = await db.$transaction(async (tx) => {
        await assertPaymentActors(tx, input.patientId, input.providerId);
        await tx.providerWallet.upsert({
            where: { providerId: input.providerId },
            update: {},
            create: { providerId: input.providerId },
        });
        const session = await tx.financialSession.create({
            data: {
                patientId: input.patientId,
                providerId: input.providerId,
                status: 'PENDING_PAYMENT',
                expectedAmountMinor: amountMinor,
                currency: input.currency ?? 'INR',
                idempotencyKey,
                razorpayOrderId: order.id,
            },
        });
        const payment = await tx.financialPayment.create({
            data: {
                sessionId: session.id,
                providerId: input.providerId,
                razorpayOrderId: order.id,
                status: 'PENDING_CAPTURE',
                amountMinor,
                currency: input.currency ?? 'INR',
            },
        });
        return { session, payment };
    });
    return {
        sessionId: created.session.id,
        paymentId: created.payment.id,
        razorpayOrderId: order.id,
        amountMinor,
        currency: input.currency ?? 'INR',
        idempotencyKey,
    };
};
exports.createSessionPayment = createSessionPayment;
const markWebhookFailed = async (eventId, errorMessage) => {
    try {
        await db.webhookLog.updateMany({
            where: { provider: 'RAZORPAY', eventId },
            data: {
                processStatus: 'FAILED',
                errorMessage,
                processedAt: new Date(),
            },
        });
    }
    catch {
        // best effort
    }
};
const processRazorpayWebhook = async (rawBody, signature) => {
    if (!env_1.env.razorpayWebhookSecret) {
        throw new error_middleware_1.AppError('RAZORPAY_WEBHOOK_SECRET not configured', 500);
    }
    const isSignatureValid = (0, razorpay_service_1.verifyRazorpayWebhookSignature)(rawBody, signature, env_1.env.razorpayWebhookSecret);
    if (!isSignatureValid) {
        throw new error_middleware_1.AppError('Invalid Razorpay webhook signature', 401);
    }
    const event = JSON.parse(rawBody);
    const eventId = String(event?.id ?? '');
    const eventType = String(event?.event ?? '');
    if (!eventId || !eventType) {
        throw new error_middleware_1.AppError('Invalid webhook payload', 422);
    }
    const cacheKey = `webhook:razorpay:${eventId}`;
    const setOk = await redis.set(cacheKey, '1', {
        NX: true,
        EX: env_1.env.webhookIdempotencyTtlSeconds,
    });
    if (!setOk) {
        return { handled: true, message: 'Duplicate webhook (cache)' };
    }
    const payloadHash = sha256(rawBody);
    try {
        await db.webhookLog.create({
            data: {
                provider: 'RAZORPAY',
                eventId,
                eventType,
                payloadHash,
                signature,
                isSignatureValid: true,
                processStatus: 'RECEIVED',
                rawPayload: event,
            },
        });
    }
    catch {
        return { handled: true, message: 'Duplicate webhook (db unique)' };
    }
    if (eventType === 'payment.captured') {
        const paymentEntity = event?.payload?.payment?.entity;
        const razorpayOrderId = String(paymentEntity?.order_id ?? '');
        const razorpayPaymentId = String(paymentEntity?.id ?? '');
        const amountMinor = asMinor(Number(paymentEntity?.amount ?? 0));
        if (!razorpayOrderId || !razorpayPaymentId || !amountMinor) {
            await markWebhookFailed(eventId, 'Missing payment identifiers');
            throw new error_middleware_1.AppError('Invalid payment.captured payload', 422);
        }
        await db.$transaction(async (tx) => {
            await tx.$queryRawUnsafe('SELECT "id" FROM "financial_payments" WHERE "razorpayOrderId" = $1 FOR UPDATE', razorpayOrderId);
            const payment = await tx.financialPayment.findFirst({
                where: { razorpayOrderId },
            });
            if (!payment) {
                throw new error_middleware_1.AppError('Payment record not found for webhook order', 404);
            }
            if (payment.status === 'CAPTURED') {
                await tx.webhookLog.updateMany({
                    where: { provider: 'RAZORPAY', eventId },
                    data: { processStatus: 'SKIPPED_DUPLICATE', processedAt: new Date() },
                });
                return;
            }
            if (payment.status === 'FAILED') {
                await tx.webhookLog.updateMany({
                    where: { provider: 'RAZORPAY', eventId },
                    data: { processStatus: 'SKIPPED_DUPLICATE', processedAt: new Date() },
                });
                return;
            }
            const therapistShareMinor = Math.floor(amountMinor * providerShareRatio);
            const platformShareMinor = amountMinor - therapistShareMinor;
            const paymentStatusUpdate = await tx.financialPayment.updateMany({
                where: {
                    id: payment.id,
                    status: { in: ['INITIATED', 'PENDING_CAPTURE'] },
                },
                data: {
                    status: 'CAPTURED',
                    razorpayPaymentId,
                    capturedAt: new Date(),
                    therapistShareMinor,
                    platformShareMinor,
                },
            });
            if (paymentStatusUpdate.count === 0) {
                await tx.webhookLog.updateMany({
                    where: { provider: 'RAZORPAY', eventId },
                    data: { processStatus: 'SKIPPED_DUPLICATE', processedAt: new Date() },
                });
                return;
            }
            let wallet = await tx.providerWallet.findUnique({
                where: { providerId: payment.providerId },
            });
            if (!wallet) {
                wallet = await tx.providerWallet.create({
                    data: { providerId: payment.providerId },
                });
            }
            await tx.$queryRawUnsafe('SELECT "providerId" FROM "provider_wallets" WHERE "providerId" = $1 FOR UPDATE', payment.providerId);
            const lockedWallet = await tx.providerWallet.findUnique({
                where: { providerId: payment.providerId },
            });
            if (!lockedWallet) {
                throw new error_middleware_1.AppError('Wallet not found after lock', 500);
            }
            const balanceBefore = BigInt(lockedWallet.pendingBalanceMinor ?? 0);
            const balanceAfter = balanceBefore + BigInt(therapistShareMinor);
            const ledger = await tx.revenueLedger.create({
                data: {
                    type: 'SESSION',
                    grossAmountMinor: amountMinor,
                    platformCommissionMinor: platformShareMinor,
                    providerShareMinor: therapistShareMinor,
                    taxAmountMinor: 0,
                    currency: payment.currency,
                    referenceId: payment.sessionId,
                    sessionId: payment.sessionId,
                    paymentId: payment.id,
                },
            });
            await tx.providerWallet.update({
                where: { providerId: payment.providerId },
                data: {
                    pendingBalanceMinor: balanceAfter,
                    lifetimeEarningsMinor: BigInt(lockedWallet.lifetimeEarningsMinor ?? 0) + BigInt(therapistShareMinor),
                    version: (lockedWallet.version ?? 1) + 1,
                },
            });
            await tx.financialSession.update({
                where: { id: payment.sessionId },
                data: {
                    status: 'CONFIRMED',
                    confirmedAt: new Date(),
                },
            });
            await tx.walletTransaction.create({
                data: {
                    providerId: payment.providerId,
                    walletTxnType: 'CREDIT_PENDING',
                    status: 'POSTED',
                    amountMinor: therapistShareMinor,
                    currency: payment.currency,
                    balanceBeforeMinor: balanceBefore,
                    balanceAfterMinor: balanceAfter,
                    sessionId: payment.sessionId,
                    paymentId: payment.id,
                    revenueLedgerId: ledger.id,
                    referenceKey: `paycap:${payment.id}`,
                    metadata: { eventId, razorpayPaymentId, razorpayOrderId },
                },
            });
            await tx.webhookLog.updateMany({
                where: { provider: 'RAZORPAY', eventId },
                data: {
                    processStatus: 'PROCESSED',
                    processedAt: new Date(),
                    sessionId: payment.sessionId,
                },
            });
        });
        return { handled: true, message: 'payment.captured processed' };
    }
    if (eventType === 'payment.failed') {
        const paymentEntity = event?.payload?.payment?.entity;
        const razorpayOrderId = String(paymentEntity?.order_id ?? '');
        if (!razorpayOrderId) {
            await markWebhookFailed(eventId, 'Missing order id');
            throw new error_middleware_1.AppError('Invalid payment.failed payload', 422);
        }
        await db.$transaction(async (tx) => {
            await tx.$queryRawUnsafe('SELECT "id" FROM "financial_payments" WHERE "razorpayOrderId" = $1 FOR UPDATE', razorpayOrderId);
            const payment = await tx.financialPayment.findFirst({ where: { razorpayOrderId } });
            if (!payment) {
                throw new error_middleware_1.AppError('Payment record not found for failed event', 404);
            }
            if (payment.status === 'CAPTURED') {
                await tx.webhookLog.updateMany({
                    where: { provider: 'RAZORPAY', eventId },
                    data: {
                        processStatus: 'SKIPPED_DUPLICATE',
                        processedAt: new Date(),
                        sessionId: payment.sessionId,
                    },
                });
                return;
            }
            const failedUpdate = await tx.financialPayment.updateMany({
                where: { id: payment.id, status: { in: ['INITIATED', 'PENDING_CAPTURE'] } },
                data: {
                    status: 'FAILED',
                    failedAt: new Date(),
                    failureReason: String(paymentEntity?.error_description ?? 'payment_failed'),
                },
            });
            if (failedUpdate.count === 0) {
                await tx.webhookLog.updateMany({
                    where: { provider: 'RAZORPAY', eventId },
                    data: {
                        processStatus: 'SKIPPED_DUPLICATE',
                        processedAt: new Date(),
                        sessionId: payment.sessionId,
                    },
                });
                return;
            }
            await tx.financialSession.updateMany({
                where: { id: payment.sessionId, status: { in: ['PENDING_PAYMENT'] } },
                data: { status: 'EXPIRED', expiredAt: new Date() },
            });
            await tx.webhookLog.updateMany({
                where: { provider: 'RAZORPAY', eventId },
                data: {
                    processStatus: 'PROCESSED',
                    processedAt: new Date(),
                    sessionId: payment.sessionId,
                },
            });
        });
        return { handled: true, message: 'payment.failed processed' };
    }
    return { handled: false, message: `Unhandled event: ${eventType}` };
};
exports.processRazorpayWebhook = processRazorpayWebhook;
const releaseSessionEarnings = async (sessionId, actorTherapistId) => {
    await db.$transaction(async (tx) => {
        await tx.$queryRawUnsafe('SELECT "id" FROM "financial_sessions" WHERE "id" = $1 FOR UPDATE', sessionId);
        const session = await tx.financialSession.findUnique({ where: { id: sessionId } });
        if (!session) {
            throw new error_middleware_1.AppError('Financial session not found', 404);
        }
        if (actorTherapistId && String(session.providerId) !== String(actorTherapistId)) {
            throw new error_middleware_1.AppError('Forbidden: therapist does not own this session', 403);
        }
        if (session.status === 'COMPLETED') {
            return;
        }
        const payment = await tx.financialPayment.findFirst({
            where: { sessionId, status: 'CAPTURED' },
            orderBy: { createdAt: 'desc' },
        });
        if (!payment) {
            throw new error_middleware_1.AppError('Captured payment not found for session', 409);
        }
        await tx.$queryRawUnsafe('SELECT "id" FROM "financial_payments" WHERE "id" = $1 FOR UPDATE', payment.id);
        const releaseReferenceKey = `release:${payment.id}`;
        const existingRelease = await tx.walletTransaction.findUnique({
            where: { referenceKey: releaseReferenceKey },
            select: { id: true },
        });
        if (existingRelease) {
            return;
        }
        await tx.$queryRawUnsafe('SELECT "providerId" FROM "provider_wallets" WHERE "providerId" = $1 FOR UPDATE', payment.providerId);
        const wallet = await tx.providerWallet.findUnique({ where: { providerId: payment.providerId } });
        if (!wallet) {
            throw new error_middleware_1.AppError('Provider wallet not found', 404);
        }
        const releaseAmount = BigInt(payment.therapistShareMinor ?? 0);
        if (BigInt(wallet.pendingBalanceMinor ?? 0) < releaseAmount) {
            throw new error_middleware_1.AppError('Insufficient pending balance for release', 409);
        }
        const before = BigInt(wallet.availableBalanceMinor ?? 0);
        const after = before + releaseAmount;
        await tx.providerWallet.update({
            where: { providerId: payment.providerId },
            data: {
                pendingBalanceMinor: BigInt(wallet.pendingBalanceMinor ?? 0) - releaseAmount,
                availableBalanceMinor: after,
                version: (wallet.version ?? 1) + 1,
            },
        });
        await tx.walletTransaction.create({
            data: {
                providerId: payment.providerId,
                walletTxnType: 'RELEASE',
                status: 'POSTED',
                amountMinor: Number(releaseAmount),
                currency: payment.currency,
                balanceBeforeMinor: before,
                balanceAfterMinor: after,
                sessionId,
                paymentId: payment.id,
                referenceKey: releaseReferenceKey,
            },
        });
        const finalized = await tx.financialSession.updateMany({
            where: { id: sessionId, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });
        if (finalized.count === 0 && session.status !== 'COMPLETED') {
            throw new error_middleware_1.AppError('Session is not in a releasable state', 409);
        }
    });
};
exports.releaseSessionEarnings = releaseSessionEarnings;
