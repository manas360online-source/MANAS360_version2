-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'THERAPIST', 'ADMIN');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TEXT', 'SLIDER', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "PatientSessionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'PAUSED');

-- CreateEnum
CREATE TYPE "BranchingConditionOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'CONTAINS', 'GREATER_THAN', 'LESS_THAN', 'IN_ARRAY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cbt_session_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "originTemplateId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'ORG',
    "latestPublishedVersionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT,
    "targetAudience" TEXT,
    "estimatedDuration" INTEGER,
    "therapistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "cbt_session_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_tags_on_templates" (
    "templateId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "template_tags_on_templates_pkey" PRIMARY KEY ("templateId","tagId")
);

-- CreateTable
CREATE TABLE "cbt_session_versions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "changeNotes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "checksum" TEXT,

    CONSTRAINT "cbt_session_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cbt_questions" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "cbt_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_branching_rules" (
    "id" TEXT NOT NULL,
    "fromQuestionId" TEXT NOT NULL,
    "toQuestionId" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "operator" "BranchingConditionOperator" NOT NULL,
    "conditionValue" TEXT NOT NULL,
    "complexCondition" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_branching_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_sessions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "templateVersionId" TEXT,
    "templateSnapshot" JSONB,
    "status" "PatientSessionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "sessionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "medicalHistory" TEXT,
    "emergencyContact" JSONB NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_assessments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "answers" INTEGER[],
    "totalScore" INTEGER NOT NULL,
    "severityLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_mood_entries" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "moodScore" INTEGER NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_mood_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_session_responses" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "responseData" JSONB NOT NULL,
    "timeSpentSeconds" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT,
    "deliveredToStream" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "previousResponseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_session_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_responses" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "responseStats" JSONB NOT NULL,
    "totalResponses" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exports" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jobId" TEXT,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "jobCreatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_template_library" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "ratings" INTEGER,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_template_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_audit_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_presence" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_logs" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "cbt_session_templates_therapistId_idx" ON "cbt_session_templates"("therapistId");

-- CreateIndex
CREATE INDEX "cbt_session_templates_status_idx" ON "cbt_session_templates"("status");

-- CreateIndex
CREATE INDEX "cbt_session_templates_category_idx" ON "cbt_session_templates"("category");

-- CreateIndex
CREATE INDEX "cbt_session_templates_createdAt_idx" ON "cbt_session_templates"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cbt_session_templates_id_version_key" ON "cbt_session_templates"("id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "template_tags_name_key" ON "template_tags"("name");

-- CreateIndex
CREATE INDEX "template_tags_on_templates_tagId_idx" ON "template_tags_on_templates"("tagId");

-- CreateIndex
CREATE INDEX "cbt_session_versions_sessionId_idx" ON "cbt_session_versions"("sessionId");

-- CreateIndex
CREATE INDEX "cbt_session_versions_createdAt_idx" ON "cbt_session_versions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cbt_session_versions_sessionId_version_key" ON "cbt_session_versions"("sessionId", "version");

-- CreateIndex
CREATE INDEX "cbt_questions_sessionId_idx" ON "cbt_questions"("sessionId");

-- CreateIndex
CREATE INDEX "cbt_questions_orderIndex_idx" ON "cbt_questions"("orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "cbt_questions_sessionId_orderIndex_key" ON "cbt_questions"("sessionId", "orderIndex");

-- CreateIndex
CREATE INDEX "question_branching_rules_fromQuestionId_idx" ON "question_branching_rules"("fromQuestionId");

-- CreateIndex
CREATE INDEX "question_branching_rules_toQuestionId_idx" ON "question_branching_rules"("toQuestionId");

-- CreateIndex
CREATE INDEX "question_branching_rules_fromQuestionId_toQuestionId_idx" ON "question_branching_rules"("fromQuestionId", "toQuestionId");

-- CreateIndex
CREATE INDEX "patient_sessions_patientId_idx" ON "patient_sessions"("patientId");

-- CreateIndex
CREATE INDEX "patient_sessions_templateId_idx" ON "patient_sessions"("templateId");

-- CreateIndex
CREATE INDEX "patient_sessions_status_idx" ON "patient_sessions"("status");

-- CreateIndex
CREATE INDEX "patient_sessions_createdAt_idx" ON "patient_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "patient_sessions_patientId_status_idx" ON "patient_sessions"("patientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_userId_key" ON "patient_profiles"("userId");

-- CreateIndex
CREATE INDEX "patient_profiles_userId_idx" ON "patient_profiles"("userId");

-- CreateIndex
CREATE INDEX "patient_assessments_patientId_createdAt_idx" ON "patient_assessments"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "patient_mood_entries_patientId_date_idx" ON "patient_mood_entries"("patientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "patient_session_responses_messageId_key" ON "patient_session_responses"("messageId");

-- CreateIndex
CREATE INDEX "patient_session_responses_sessionId_idx" ON "patient_session_responses"("sessionId");

-- CreateIndex
CREATE INDEX "patient_session_responses_patientId_idx" ON "patient_session_responses"("patientId");

-- CreateIndex
CREATE INDEX "patient_session_responses_questionId_idx" ON "patient_session_responses"("questionId");

-- CreateIndex
CREATE INDEX "patient_session_responses_answeredAt_idx" ON "patient_session_responses"("answeredAt");

-- CreateIndex
CREATE INDEX "patient_session_responses_sessionId_patientId_idx" ON "patient_session_responses"("sessionId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_session_responses_sessionId_questionId_key" ON "patient_session_responses"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "patient_responses_questionId_idx" ON "patient_responses"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_responses_questionId_key" ON "patient_responses"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "session_exports_jobId_key" ON "session_exports"("jobId");

-- CreateIndex
CREATE INDEX "session_exports_sessionId_idx" ON "session_exports"("sessionId");

-- CreateIndex
CREATE INDEX "session_exports_status_idx" ON "session_exports"("status");

-- CreateIndex
CREATE INDEX "session_exports_createdAt_idx" ON "session_exports"("createdAt");

-- CreateIndex
CREATE INDEX "session_template_library_category_idx" ON "session_template_library"("category");

-- CreateIndex
CREATE INDEX "session_template_library_isApproved_idx" ON "session_template_library"("isApproved");

-- CreateIndex
CREATE UNIQUE INDEX "session_template_library_templateId_key" ON "session_template_library"("templateId");

-- CreateIndex
CREATE INDEX "session_audit_logs_sessionId_idx" ON "session_audit_logs"("sessionId");

-- CreateIndex
CREATE INDEX "session_audit_logs_userId_idx" ON "session_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "session_audit_logs_action_idx" ON "session_audit_logs"("action");

-- CreateIndex
CREATE INDEX "session_audit_logs_createdAt_idx" ON "session_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "session_presence_sessionId_idx" ON "session_presence"("sessionId");

-- CreateIndex
CREATE INDEX "session_presence_userId_idx" ON "session_presence"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_presence_sessionId_userId_role_key" ON "session_presence"("sessionId", "userId", "role");

-- CreateIndex
CREATE INDEX "export_logs_therapistId_idx" ON "export_logs"("therapistId");

-- CreateIndex
CREATE INDEX "export_logs_sessionId_idx" ON "export_logs"("sessionId");

-- CreateIndex
CREATE INDEX "export_logs_createdAt_idx" ON "export_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "cbt_session_templates" ADD CONSTRAINT "cbt_session_templates_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_tags_on_templates" ADD CONSTRAINT "template_tags_on_templates_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "cbt_session_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_tags_on_templates" ADD CONSTRAINT "template_tags_on_templates_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "template_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbt_session_versions" ADD CONSTRAINT "cbt_session_versions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "cbt_session_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cbt_questions" ADD CONSTRAINT "cbt_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "cbt_session_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_branching_rules" ADD CONSTRAINT "question_branching_rules_fromQuestionId_fkey" FOREIGN KEY ("fromQuestionId") REFERENCES "cbt_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_branching_rules" ADD CONSTRAINT "question_branching_rules_toQuestionId_fkey" FOREIGN KEY ("toQuestionId") REFERENCES "cbt_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_sessions" ADD CONSTRAINT "patient_sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_sessions" ADD CONSTRAINT "patient_sessions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "cbt_session_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_assessments" ADD CONSTRAINT "patient_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_mood_entries" ADD CONSTRAINT "patient_mood_entries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_session_responses" ADD CONSTRAINT "patient_session_responses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "patient_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_session_responses" ADD CONSTRAINT "patient_session_responses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_session_responses" ADD CONSTRAINT "patient_session_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "cbt_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_session_responses" ADD CONSTRAINT "patient_session_responses_previousResponseId_fkey" FOREIGN KEY ("previousResponseId") REFERENCES "patient_session_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_responses" ADD CONSTRAINT "patient_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "cbt_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exports" ADD CONSTRAINT "session_exports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "patient_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_template_library" ADD CONSTRAINT "session_template_library_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "cbt_session_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

