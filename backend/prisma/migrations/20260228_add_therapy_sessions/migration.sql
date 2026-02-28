-- Migration: Add therapy_sessions table and BookingStatus enum

-- Ensure pgcrypto uuid generator is available (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum type for booking status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bookingstatus') THEN
    CREATE TYPE "BookingStatus" AS ENUM ('PENDING','CONFIRMED','CANCELLED','COMPLETED');
  END IF;
END$$;

-- Create therapy_sessions table
CREATE TABLE IF NOT EXISTS therapy_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference_id TEXT UNIQUE NOT NULL,
  patient_profile_id TEXT NOT NULL,
  therapist_profile_id TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  status "BookingStatus" NOT NULL DEFAULT 'PENDING',
  note_encrypted_content TEXT,
  note_iv TEXT,
  note_auth_tag TEXT,
  note_updated_at TIMESTAMPTZ,
  note_updated_by_therapist_id TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_therapist_datetime ON therapy_sessions(therapist_profile_id, date_time);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_patient_datetime ON therapy_sessions(patient_profile_id, date_time);

-- Add foreign-key-like constraints are intentionally omitted to avoid cross-schema coupling with existing tables managed outside this migration flow.
