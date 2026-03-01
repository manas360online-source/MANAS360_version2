-- Patient full-flow core extensions

DO $$ BEGIN
    CREATE TYPE "BookingIntentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "therapy_sessions"
    ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN IF NOT EXISTS "sessionFeeMinor" BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    ADD COLUMN IF NOT EXISTS "agoraChannel" TEXT,
    ADD COLUMN IF NOT EXISTS "agoraToken" TEXT;

CREATE TABLE IF NOT EXISTS "session_booking_intents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinute" INTEGER NOT NULL DEFAULT 50,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "status" "BookingIntentStatus" NOT NULL DEFAULT 'PENDING',
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_booking_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "session_booking_intents_razorpayOrderId_key" ON "session_booking_intents"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "session_booking_intents_patientId_status_createdAt_idx" ON "session_booking_intents"("patientId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "session_booking_intents_providerId_scheduledAt_idx" ON "session_booking_intents"("providerId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "session_booking_intents_scheduledAt_idx" ON "session_booking_intents"("scheduledAt");

CREATE TABLE IF NOT EXISTS "ai_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_conversations_userId_createdAt_idx" ON "ai_conversations"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_scheduledAt_idx" ON "notifications"("scheduledAt");

DO $$ BEGIN
    ALTER TABLE "session_booking_intents"
      ADD CONSTRAINT "session_booking_intents_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "session_booking_intents"
      ADD CONSTRAINT "session_booking_intents_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ai_conversations"
      ADD CONSTRAINT "ai_conversations_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
