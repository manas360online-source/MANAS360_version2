CREATE TABLE IF NOT EXISTS "phq9_assessments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "answers" INTEGER[] NOT NULL,
  "total_score" INTEGER NOT NULL,
  "q9_score" INTEGER NOT NULL,
  "severity" TEXT NOT NULL,
  "risk_weight" DOUBLE PRECISION NOT NULL,
  "q9_crisis_flag" BOOLEAN NOT NULL DEFAULT FALSE,
  "assessed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "phq9_assessments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "phq9_assessments_user_ts_idx" ON "phq9_assessments" ("user_id", "assessed_at" DESC);
CREATE INDEX IF NOT EXISTS "phq9_assessments_q9_idx" ON "phq9_assessments" ("q9_crisis_flag", "assessed_at" DESC);

CREATE TABLE IF NOT EXISTS "gad7_assessments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "answers" INTEGER[] NOT NULL,
  "total_score" INTEGER NOT NULL,
  "severity" TEXT NOT NULL,
  "risk_weight" DOUBLE PRECISION NOT NULL,
  "assessed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "gad7_assessments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "gad7_assessments_user_ts_idx" ON "gad7_assessments" ("user_id", "assessed_at" DESC);

CREATE TABLE IF NOT EXISTS "risk_scores" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "phq9_component" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "gad7_component" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "chat_component" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "behavioral_component" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "composite_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "risk_level" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'system',
  "metadata" JSONB,
  "evaluated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "risk_scores_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "risk_scores_user_ts_idx" ON "risk_scores" ("user_id", "evaluated_at" DESC);
CREATE INDEX IF NOT EXISTS "risk_scores_level_ts_idx" ON "risk_scores" ("risk_level", "evaluated_at" DESC);

CREATE TABLE IF NOT EXISTS "crisis_escalations" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "risk_score_id" TEXT,
  "risk_level" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reason" TEXT,
  "ops_alerted_at" TIMESTAMPTZ,
  "patient_shown_at" TIMESTAMPTZ,
  "therapist_alerted_at" TIMESTAMPTZ,
  "backup_alerted_at" TIMESTAMPTZ,
  "therapist_ack_at" TIMESTAMPTZ,
  "therapist_id" TEXT,
  "backup_therapist_id" TEXT,
  "payload" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "crisis_escalations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "crisis_escalations_user_status_idx" ON "crisis_escalations" ("user_id", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "crisis_escalations_level_status_idx" ON "crisis_escalations" ("risk_level", "status", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "mood_logs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "mood_value" INTEGER NOT NULL,
  "note" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "logged_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mood_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "mood_logs_user_ts_idx" ON "mood_logs" ("user_id", "logged_at" DESC);

CREATE TABLE IF NOT EXISTS "chat_analyses" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "bot_type" TEXT NOT NULL,
  "message_content" TEXT NOT NULL,
  "sentiment_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "crisis_risk" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "crisis_intent" BOOLEAN NOT NULL DEFAULT FALSE,
  "urgency_level" TEXT NOT NULL DEFAULT 'LOW',
  "detected_themes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "fallback_used" BOOLEAN NOT NULL DEFAULT FALSE,
  "analysis_json" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "chat_analyses_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "chat_analyses_user_ts_idx" ON "chat_analyses" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "chat_analyses_urgency_ts_idx" ON "chat_analyses" ("urgency_level", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "mood_predictions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "prediction_date" TIMESTAMPTZ NOT NULL,
  "predicted_mood" DOUBLE PRECISION NOT NULL,
  "confidence_pct" DOUBLE PRECISION NOT NULL,
  "trend_direction" TEXT NOT NULL,
  "deterioration_alert" BOOLEAN NOT NULL DEFAULT FALSE,
  "factor_analysis" JSONB,
  "actual_mood" DOUBLE PRECISION,
  "mae_snapshot" DOUBLE PRECISION,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mood_predictions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "mood_predictions_user_date_uq" UNIQUE ("user_id", "prediction_date")
);
CREATE INDEX IF NOT EXISTS "mood_predictions_user_date_idx" ON "mood_predictions" ("user_id", "prediction_date" DESC);
