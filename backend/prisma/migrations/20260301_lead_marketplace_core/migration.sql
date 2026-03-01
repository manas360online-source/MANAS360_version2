CREATE TYPE "LeadStatus" AS ENUM ('AVAILABLE', 'PURCHASED', 'EXPIRED', 'NO_RESPONSE', 'ACCEPTED');

CREATE TABLE "leads" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'AVAILABLE',
  "matchScore" INTEGER,
  "amountMinor" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "previewData" JSONB,
  "patientAcceptanceUntil" TIMESTAMP(3),
  "providerContactedAt" TIMESTAMP(3),
  "purchasedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leads_idempotencyKey_key" ON "leads"("idempotencyKey");
CREATE INDEX "leads_status_createdAt_idx" ON "leads"("status", "createdAt" DESC);
CREATE INDEX "leads_providerId_status_idx" ON "leads"("providerId", "status");
CREATE INDEX "leads_patientId_status_idx" ON "leads"("patientId", "status");
CREATE INDEX "leads_patientAcceptanceUntil_idx" ON "leads"("patientAcceptanceUntil");

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
