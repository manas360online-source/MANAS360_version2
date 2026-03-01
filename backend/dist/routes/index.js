"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const patient_routes_1 = __importDefault(require("./patient.routes"));
const therapist_routes_1 = __importDefault(require("./therapist.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
const cbt_session_routes_1 = __importDefault(require("./cbt-session.routes"));
const presence_routes_1 = __importDefault(require("./presence.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const payment_routes_1 = __importDefault(require("./payment.routes"));
const subscription_routes_1 = __importDefault(require("./subscription.routes"));
const webhook_routes_1 = __importDefault(require("./webhook.routes"));
const lead_routes_1 = __importDefault(require("./lead.routes"));
const patient_v1_routes_1 = __importDefault(require("./patient-v1.routes"));
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    res.status(200).json({
        ok: true,
        service: 'manas360-backend',
        timestamp: new Date().toISOString(),
    });
});
router.use('/auth', auth_routes_1.default);
router.use('/v1/auth', auth_routes_1.default);
router.use('/v1', patient_v1_routes_1.default);
router.use('/v1/users', user_routes_1.default);
router.use('/v1/patients', patient_routes_1.default);
router.use('/v1/therapists', therapist_routes_1.default);
router.use('/v1/therapist', therapist_routes_1.default);
router.use('/v1/admin', admin_routes_1.default);
router.use('/v1/cbt-sessions', cbt_session_routes_1.default);
router.use('/v1/presence', presence_routes_1.default);
router.use('/v1/therapist/dashboard', dashboard_routes_1.default);
router.use('/v1/therapists/dashboard', dashboard_routes_1.default);
router.use('/v1/payments', payment_routes_1.default);
router.use('/v1/subscriptions', subscription_routes_1.default);
router.use('/v1/leads', lead_routes_1.default);
router.use('/webhooks', webhook_routes_1.default);
exports.default = router;
