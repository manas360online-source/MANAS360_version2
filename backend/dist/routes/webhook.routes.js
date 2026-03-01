"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.post('/razorpay', rateLimiter_middleware_1.webhookRateLimiter, (0, validate_middleware_1.asyncHandler)(payment_controller_1.razorpayWebhookController));
exports.default = router;
