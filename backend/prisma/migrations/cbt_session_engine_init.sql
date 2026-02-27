-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'THERAPIST', 'ADMIN');
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DEPRECATED');
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TEXT', 'SLIDER', 'CHECKBOX');
CREATE TYPE "PatientSessionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'PAUSED');
CREATE TYPE "BranchingConditionOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'CONTAINS', 'GREATER_THAN', 'LESS_THAN', 'IN_ARRAY');

-- CreateTable users
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateTable cbt_session_templates
CREATE TABLE "cbt_session_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT,
    "targetAudience" TEXT,
    "estimatedDuration" INTEGER,
    "therapistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "cbt_session_templates_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "cbt_session_templates_therapistId_idx" ON "cbt_session_templates"("therapistId");
CREATE INDEX "cbt_session_templates_status_idx" ON "cbt_session_templates"("status");
CREATE INDEX "cbt_session_templates_category_idx" ON "cbt_session_templates"("category");
CREATE INDEX "cbt_session_templates_createdAt_idx" ON "cbt_session_templates"("createdAt");
CREATE UNIQUE INDEX "cbt_session_templates_id_version_key" ON "cbt_session_templates"("id", "version");

-- CreateTable cbt_session_versions
CREATE TABLE "cbt_session_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "changeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cbt_session_versions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "cbt_session_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "cbt_session_versions_sessionId_version_key" ON "cbt_session_versions"("sessionId", "version");
CREATE INDEX "cbt_session_versions_sessionId_idx" ON "cbt_session_versions"("sessionId");
CREATE INDEX "cbt_session_versions_createdAt_idx" ON "cbt_session_versions"("createdAt");

-- CreateTable cbt_questions
CREATE TABLE "cbt_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "helpText" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cbt_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "cbt_session_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "cbt_questions_sessionId_idx" ON "cbt_questions"("sessionId");
CREATE INDEX "cbt_questions_orderIndex_idx" ON "cbt_questions"("orderIndex");
CREATE UNIQUE INDEX "cbt_questions_sessionId_orderIndex_key" ON "cbt_questions"("sessionId", "orderIndex");

-- CreateTable question_branching_rules
CREATE TABLE "question_branching_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromQuestionId" TEXT NOT NULL,
    "toQuestionId" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "operator" "BranchingConditionOperator" NOT NULL,
    "conditionValue" TEXT NOT NULL,
    "complexCondition" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_branching_rules_fromQuestionId_fkey" FOREIGN KEY ("fromQuestionId") REFERENCES "cbt_questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "question_branching_rules_toQuestionId_fkey" FOREIGN KEY ("toQuestionId") REFERENCES "cbt_questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "question_branching_rules_fromQuestionId_idx" ON "question_branching_rules"("fromQuestionId");
CREATE INDEX "question_branching_rules_toQuestionId_idx" ON "question_branching_rules"("toQuestionId");
CREATE INDEX "question_branching_rules_fromQuestionId_toQuestionId_idx" ON "question_branching_rules"("fromQuestionId", "toQuestionId");

-- CreateTable patient_sessions
CREATE TABLE "patient_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "status" "PatientSessionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "sessionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patient_sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_sessions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "cbt_session_templates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "patient_sessions_patientId_idx" ON "patient_sessions"("patientId");
CREATE INDEX "patient_sessions_templateId_idx" ON "patient_sessions"("templateId");
CREATE INDEX "patient_sessions_status_idx" ON "patient_sessions"("status");
CREATE INDEX "patient_sessions_createdAt_idx" ON "patient_sessions"("createdAt");
CREATE INDEX "patient_sessions_patientId_status_idx" ON "patient_sessions"("patientId", "status");

-- CreateTable patient_session_responses
CREATE TABLE "patient_session_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "responseData" JSONB NOT NULL,
    "timeSpentSeconds" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousResponseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patient_session_responses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "patient_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_session_responses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_session_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "cbt_questions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "patient_session_responses_previousResponseId_fkey" FOREIGN KEY ("previousResponseId") REFERENCES "patient_session_responses" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patient_session_responses_sessionId_questionId_key" ON "patient_session_responses"("sessionId", "questionId");
CREATE INDEX "patient_session_responses_sessionId_idx" ON "patient_session_responses"("sessionId");
CREATE INDEX "patient_session_responses_patientId_idx" ON "patient_session_responses"("patientId");
CREATE INDEX "patient_session_responses_questionId_idx" ON "patient_session_responses"("questionId");
CREATE INDEX "patient_session_responses_answeredAt_idx" ON "patient_session_responses"("answeredAt");
CREATE INDEX "patient_session_responses_sessionId_patientId_idx" ON "patient_session_responses"("sessionId", "patientId");

-- CreateTable patient_responses
CREATE TABLE "patient_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "responseStats" JSONB NOT NULL,
    "totalResponses" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patient_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "cbt_questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "patient_responses_questionId_key" ON "patient_responses"("questionId");
CREATE INDEX "patient_responses_questionId_idx" ON "patient_responses"("questionId");

-- CreateTable session_exports
CREATE TABLE "session_exports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "session_exports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "patient_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "session_exports_sessionId_idx" ON "session_exports"("sessionId");
CREATE INDEX "session_exports_status_idx" ON "session_exports"("status");
CREATE INDEX "session_exports_createdAt_idx" ON "session_exports"("createdAt");

-- CreateTable session_template_library
CREATE TABLE "session_template_library" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "ratings" INTEGER,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "session_template_library_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "cbt_session_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "session_template_library_templateId_key" ON "session_template_library"("templateId");
CREATE INDEX "session_template_library_category_idx" ON "session_template_library"("category");
CREATE INDEX "session_template_library_isApproved_idx" ON "session_template_library"("isApproved");

-- CreateTable session_audit_logs
CREATE TABLE "session_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "session_audit_logs_sessionId_idx" ON "session_audit_logs"("sessionId");
CREATE INDEX "session_audit_logs_userId_idx" ON "session_audit_logs"("userId");
CREATE INDEX "session_audit_logs_action_idx" ON "session_audit_logs"("action");
CREATE INDEX "session_audit_logs_createdAt_idx" ON "session_audit_logs"("createdAt");

-- Create Full-Text Search Index
CREATE INDEX cbt_session_templates_title_description_fulltext_idx 
ON cbt_session_templates USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
