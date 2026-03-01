CREATE TYPE "LeadPaymentStatus" AS ENUM ('NOT_REQUIRED', 'INITIATED', 'CAPTURED', 'FAILED');

ALTER TABLE "leads"
  ADD COLUMN "paymentStatus" "LeadPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "razorpayOrderId" TEXT,
  ADD COLUMN "razorpayPaymentId" TEXT,
  ADD COLUMN "paymentCapturedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "leads_razorpayOrderId_key" ON "leads"("razorpayOrderId");
CREATE UNIQUE INDEX "leads_razorpayPaymentId_key" ON "leads"("razorpayPaymentId");
CREATE INDEX "leads_providerId_paymentStatus_idx" ON "leads"("providerId", "paymentStatus");
