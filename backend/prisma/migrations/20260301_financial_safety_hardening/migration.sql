-- Financial Safety Hardening (PostgreSQL)
-- Date: 2026-03-01

BEGIN;

-- =========================
-- 1) Data integrity checks
-- =========================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'provider_wallets_available_non_negative_chk'
  ) THEN
    ALTER TABLE "provider_wallets"
      ADD CONSTRAINT "provider_wallets_available_non_negative_chk"
      CHECK ("availableBalanceMinor" >= 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'provider_wallets_pending_non_negative_chk'
  ) THEN
    ALTER TABLE "provider_wallets"
      ADD CONSTRAINT "provider_wallets_pending_non_negative_chk"
      CHECK ("pendingBalanceMinor" >= 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_payments_amount_positive_chk'
  ) THEN
    ALTER TABLE "financial_payments"
      ADD CONSTRAINT "financial_payments_amount_positive_chk"
      CHECK ("amountMinor" > 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_sessions_expected_amount_positive_chk'
  ) THEN
    ALTER TABLE "financial_sessions"
      ADD CONSTRAINT "financial_sessions_expected_amount_positive_chk"
      CHECK ("expectedAmountMinor" > 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payout_requests_amount_positive_chk'
  ) THEN
    ALTER TABLE "payout_requests"
      ADD CONSTRAINT "payout_requests_amount_positive_chk"
      CHECK ("amountMinor" > 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_invoices_amount_positive_chk'
  ) THEN
    ALTER TABLE "subscription_invoices"
      ADD CONSTRAINT "subscription_invoices_amount_positive_chk"
      CHECK ("amountMinor" > 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'revenue_ledger_amounts_non_negative_chk'
  ) THEN
    ALTER TABLE "revenue_ledger"
      ADD CONSTRAINT "revenue_ledger_amounts_non_negative_chk"
      CHECK (
        "grossAmountMinor" >= 0
        AND "platformCommissionMinor" >= 0
        AND "providerShareMinor" >= 0
        AND "taxAmountMinor" >= 0
      ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'revenue_ledger_balance_equation_chk'
  ) THEN
    ALTER TABLE "revenue_ledger"
      ADD CONSTRAINT "revenue_ledger_balance_equation_chk"
      CHECK (
        "grossAmountMinor" = "platformCommissionMinor" + "providerShareMinor" + "taxAmountMinor"
      ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'revenue_ledger_exactly_one_source_chk'
  ) THEN
    ALTER TABLE "revenue_ledger"
      ADD CONSTRAINT "revenue_ledger_exactly_one_source_chk"
      CHECK (num_nonnulls("paymentId", "sessionId", "subscriptionId") = 1) NOT VALID;
  END IF;
END $$;

-- =========================
-- 2) Webhook/idempotency safety
-- =========================

-- Keep provider+eventId uniqueness, and add provider-scoped exact index for Razorpay.
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_logs_razorpay_event_id_uniq"
ON "webhook_logs" ("eventId")
WHERE "provider" = 'RAZORPAY';

-- =========================
-- 3) Performance indexes
-- =========================

CREATE INDEX IF NOT EXISTS "financial_sessions_provider_created_desc_idx"
ON "financial_sessions" ("providerId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "financial_sessions_status_created_desc_idx"
ON "financial_sessions" ("status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "financial_payments_provider_created_desc_idx"
ON "financial_payments" ("providerId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "financial_payments_session_status_created_desc_idx"
ON "financial_payments" ("sessionId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "marketplace_subscriptions_status_plan_created_desc_idx"
ON "marketplace_subscriptions" ("status", "plan", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "revenue_ledger_created_desc_idx"
ON "revenue_ledger" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "revenue_ledger_subscription_created_desc_idx"
ON "revenue_ledger" ("subscriptionId", "createdAt" DESC)
WHERE "subscriptionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "wallet_transactions_provider_txn_created_desc_idx"
ON "wallet_transactions" ("providerId", "walletTxnType", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "webhook_logs_provider_status_firstseen_desc_idx"
ON "webhook_logs" ("provider", "processStatus", "firstSeenAt" DESC);

CREATE INDEX IF NOT EXISTS "payout_requests_provider_requested_desc_idx"
ON "payout_requests" ("providerId", "requestedAt" DESC);

-- =========================
-- 4) Append-only enforcement
-- =========================

CREATE OR REPLACE FUNCTION prevent_financial_history_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Financial history rows are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_update_revenue_ledger ON "revenue_ledger";
CREATE TRIGGER trg_no_update_revenue_ledger
BEFORE UPDATE OR DELETE ON "revenue_ledger"
FOR EACH ROW EXECUTE FUNCTION prevent_financial_history_mutation();

DROP TRIGGER IF EXISTS trg_no_update_wallet_transactions ON "wallet_transactions";
CREATE TRIGGER trg_no_update_wallet_transactions
BEFORE UPDATE OR DELETE ON "wallet_transactions"
FOR EACH ROW EXECUTE FUNCTION prevent_financial_history_mutation();

COMMIT;
