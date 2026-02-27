-- CBT Session Engine - SQL Reference Queries

-- ============================================
-- TEMPLATE QUERIES
-- ============================================

-- Get all published templates by therapist
SELECT * FROM cbt_session_templates 
WHERE therapistId = $1 AND status = 'PUBLISHED'
ORDER BY createdAt DESC;

-- Get template with full question tree
SELECT 
  t.*,
  json_agg(json_build_object(
    'id', q.id,
    'type', q.type,
    'prompt', q.prompt,
    'orderIndex', q.orderIndex,
    'metadata', q.metadata
  ) ORDER BY q.orderIndex) as questions
FROM cbt_session_templates t
LEFT JOIN cbt_questions q ON t.id = q.sessionId
WHERE t.id = $1
GROUP BY t.id;

-- Get templates by category (with pagination)
SELECT * FROM cbt_session_templates 
WHERE status = 'PUBLISHED' AND category = $1
ORDER BY createdAt DESC
LIMIT 20 OFFSET $2;

-- Search templates by title or description
SELECT * FROM cbt_session_templates 
WHERE status = 'PUBLISHED' 
AND (to_tsvector('english', title || ' ' || COALESCE(description, '')) 
     @@ plainto_tsquery('english', $1))
ORDER BY ts_rank(to_tsvector('english', title || ' ' || COALESCE(description, '')), 
                   plainto_tsquery('english', $1)) DESC;

-- ============================================
-- QUESTION QUERIES
-- ============================================

-- Get all questions for a template with branching rules
SELECT 
  q.*,
  json_agg(
    json_build_object(
      'toQuestionId', br.toQuestionId,
      'operator', br.operator,
      'conditionValue', br.conditionValue,
      'isActive', br.isActive
    )
  ) FILTER (WHERE br.id IS NOT NULL) as branchingRules
FROM cbt_questions q
LEFT JOIN question_branching_rules br ON q.id = br.fromQuestionId AND br.isActive = true
WHERE q.sessionId = $1
GROUP BY q.id
ORDER BY q.orderIndex;

-- Get branching rules for a specific question
SELECT br.*, tq.prompt as targetQuestionPrompt
FROM question_branching_rules br
JOIN cbt_questions tq ON br.toQuestionId = tq.id
WHERE br.fromQuestionId = $1 AND br.isActive = true
ORDER BY br.createdAt DESC;

-- ============================================
-- PATIENT SESSION QUERIES
-- ============================================

-- Get patient's active sessions
SELECT ps.*, t.title as templateTitle
FROM patient_sessions ps
JOIN cbt_session_templates t ON ps.templateId = t.id
WHERE ps.patientId = $1 AND ps.status IN ('NOT_STARTED', 'IN_PROGRESS', 'PAUSED')
ORDER BY ps.createdAt DESC;

-- Get patient's completed sessions
SELECT ps.*, t.title as templateTitle
FROM patient_sessions ps
JOIN cbt_session_templates t ON ps.templateId = t.id
WHERE ps.patientId = $1 AND ps.status = 'COMPLETED'
ORDER BY ps.completedAt DESC;

-- Get session with all responses
SELECT 
  ps.*,
  json_agg(json_build_object(
    'id', psr.id,
    'questionId', psr.questionId,
    'responseData', psr.responseData,
    'timeSpentSeconds', psr.timeSpentSeconds,
    'answeredAt', psr.answeredAt
  ) ORDER BY psr.answeredAt) as responses
FROM patient_sessions ps
LEFT JOIN patient_session_responses psr ON ps.id = psr.sessionId
WHERE ps.id = $1
GROUP BY ps.id;

-- Get sessions by status (for dashboard)
SELECT 
  status,
  COUNT(*) as count,
  AVG(currentQuestionIndex) as avgProgress
FROM patient_sessions
WHERE patientId = $1
GROUP BY status;

-- ============================================
-- RESPONSE ANALYTICS
-- ============================================

-- Get response statistics for a question
SELECT 
  q.id,
  q.prompt,
  q.type,
  COUNT(psr.id) as totalResponses,
  AVG(psr.timeSpentSeconds)::INTEGER as avgTimeSeconds,
  MIN(psr.answeredAt) as firstResponse,
  MAX(psr.answeredAt) as lastResponse
FROM cbt_questions q
LEFT JOIN patient_session_responses psr ON q.id = psr.questionId
WHERE q.sessionId = $1
GROUP BY q.id, q.prompt, q.type
ORDER BY q.orderIndex;

-- Get most common responses (for multiple choice)
SELECT 
  psr.responseData->>'selectedOptionId' as optionId,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM patient_session_responses psr
WHERE psr.questionId = $1 AND psr.responseData->>'selectedOptionId' IS NOT NULL
GROUP BY psr.responseData->>'selectedOptionId'
ORDER BY count DESC;

-- Get slider responses statistics
SELECT 
  q.prompt,
  AVG(CAST(psr.responseData->>'value' AS DECIMAL)) as average,
  MIN(CAST(psr.responseData->>'value' AS DECIMAL)) as minimum,
  MAX(CAST(psr.responseData->>'value' AS DECIMAL)) as maximum,
  STDDEV(CAST(psr.responseData->>'value' AS DECIMAL)) as stdDev
FROM cbt_questions q
JOIN patient_session_responses psr ON q.id = psr.questionId
WHERE q.sessionId = $1 AND q.type = 'SLIDER'
GROUP BY q.id, q.prompt;

-- ============================================
-- TEMPLATE PERFORMANCE METRICS
-- ============================================

-- Get template usage statistics
SELECT 
  ps.templateId,
  t.title,
  COUNT(ps.id) as totalSessions,
  SUM(CASE WHEN ps.status = 'COMPLETED' THEN 1 ELSE 0 END) as completedSessions,
  ROUND(100.0 * SUM(CASE WHEN ps.status = 'COMPLETED' THEN 1 ELSE 0 END) / COUNT(ps.id), 2) as completionRate,
  AVG(ps.currentQuestionIndex) as avgQuestionsAnswered,
  COUNT(DISTINCT ps.patientId) as uniquePatients
FROM patient_sessions ps
JOIN cbt_session_templates t ON ps.templateId = t.id
GROUP BY ps.templateId, t.title
ORDER BY totalSessions DESC;

-- Get template completion time metrics
SELECT 
  t.title,
  AVG(EXTRACT(EPOCH FROM (ps.completedAt - ps.startedAt)) / 60)::INTEGER as avgCompletionMinutes,
  MIN(EXTRACT(EPOCH FROM (ps.completedAt - ps.startedAt)) / 60)::INTEGER as minDuration,
  MAX(EXTRACT(EPOCH FROM (ps.completedAt - ps.startedAt)) / 60)::INTEGER as maxDuration,
  STDDEV(EXTRACT(EPOCH FROM (ps.completedAt - ps.startedAt)) / 60)::DECIMAL as stdDeviation
FROM patient_sessions ps
JOIN cbt_session_templates t ON ps.templateId = t.id
WHERE ps.status = 'COMPLETED'
GROUP BY t.id, t.title;

-- ============================================
-- ABANDONED SESSION ANALYSIS
-- ============================================

-- Get abandoned sessions with drop-off point
SELECT 
  ps.id as sessionId,
  ps.patientId,
  t.title,
  ps.currentQuestionIndex as stoppedAtQuestion,
  q.prompt as lastQuestionSeen,
  EXTRACT(EPOCH FROM (ps.abandonedAt - ps.startedAt)) / 60 as sessionDurationMinutes
FROM patient_sessions ps
JOIN cbt_session_templates t ON ps.templateId = t.id
LEFT JOIN cbt_questions q ON t.id = q.sessionId AND q.orderIndex = ps.currentQuestionIndex
WHERE ps.status = 'ABANDONED' AND ps.abandonedAt > NOW() - INTERVAL '7 days'
ORDER BY ps.abandonedAt DESC;

-- Get abandonment rate by question
SELECT 
  q.orderIndex,
  q.prompt,
  COUNT(DISTINCT ps.id) as sessionsReachedThisQuestion,
  COUNT(DISTINCT CASE WHEN ps.status = 'ABANDONED' AND ps.currentQuestionIndex = q.orderIndex + 1 
                      THEN ps.id END) as abandonedAtThisQuestion,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN ps.status = 'ABANDONED' AND ps.currentQuestionIndex = q.orderIndex + 1 
                                     THEN ps.id END) / 
        NULLIF(COUNT(DISTINCT ps.id), 0), 2) as abandonment_rate
FROM cbt_questions q
LEFT JOIN patient_sessions ps ON q.sessionId = ps.templateId
WHERE q.sessionId = $1
GROUP BY q.id, q.orderIndex, q.prompt
ORDER BY q.orderIndex;

-- ============================================
-- AUDIT TRAIL QUERIES
-- ============================================

-- Get all changes to a template
SELECT sal.*,
  u.firstName || ' ' || u.lastName as actionBy
FROM session_audit_logs sal
LEFT JOIN users u ON sal.userId = u.id
WHERE sal.entityType = 'SESSION_TEMPLATE' AND sal.entityId = $1
ORDER BY sal.createdAt DESC;

-- Get template modification timeline
SELECT 
  DATE(createdAt) as date,
  COUNT(*) as changeCount,
  json_agg(DISTINCT action) as actions
FROM session_audit_logs
WHERE entityType = 'SESSION_TEMPLATE' AND entityId = $1
GROUP BY DATE(createdAt)
ORDER BY date DESC;

-- ============================================
-- EXPORT & COMPLIANCE QUERIES
-- ============================================

-- Get export history for session
SELECT * FROM session_exports
WHERE sessionId = $1
ORDER BY createdAt DESC;

-- Get pending exports
SELECT se.*, ps.id as patientSessionId
FROM session_exports se
JOIN patient_sessions ps ON se.sessionId = ps.id
WHERE se.status = 'PENDING'
ORDER BY se.createdAt;

-- Find exports ready for deletion (retention policy)
SELECT * FROM session_exports
WHERE expiresAt < NOW() AND status = 'COMPLETED'
ORDER BY createdAt DESC;

-- ============================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- ============================================

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active queries
SELECT 
  pid,
  query,
  state,
  query_start,
  EXTRACT(EPOCH FROM (NOW() - query_start))::INTEGER as duration_seconds
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start DESC;

-- Identify missing indexes
SELECT 
  schemaname,
  tablename,
  ARRAY_AGG(attname) as missing_index_columns
FROM pg_stat_user_tables, 
     pg_attribute
WHERE pg_stat_user_tables.relid = pg_attribute.attrelid
  AND pg_attribute.attnum > 0
  AND NOT pg_attribute.attisdropped
  AND pg_stat_user_tables.seq_scan > pg_stat_user_tables.idx_scan
GROUP BY schemaname, tablename;

-- ============================================
-- BULK OPERATIONS (ADMIN)
-- ============================================

-- Archive templates older than 1 year
UPDATE cbt_session_templates 
SET status = 'ARCHIVED'
WHERE status = 'PUBLISHED' 
  AND updatedAt < NOW() - INTERVAL '1 year'
  AND id NOT IN (
    SELECT DISTINCT templateId FROM patient_sessions 
    WHERE completedAt > NOW() - INTERVAL '1 year'
  );

-- Delete old exports
DELETE FROM session_exports
WHERE expiresAt < NOW() AND status = 'COMPLETED';

-- Clear abandoned sessions older than 6 months
DELETE FROM patient_sessions
WHERE status = 'ABANDONED' 
  AND abandonedAt < NOW() - INTERVAL '6 months';

-- ============================================
-- DATA EXPORT FOR REPORTING
-- ============================================

-- Export patient responses as CSV-ready data
SELECT 
  ps.id as session_id,
  u.email as patient_email,
  t.title as template_title,
  q.prompt as question,
  q.type as question_type,
  psr.responseData as response,
  psr.timeSpentSeconds as time_spent,
  psr.answeredAt as answered_at,
  ps.status as session_status
FROM patient_sessions ps
JOIN users u ON ps.patientId = u.id
JOIN cbt_session_templates t ON ps.templateId = t.id
LEFT JOIN patient_session_responses psr ON ps.id = psr.sessionId
LEFT JOIN cbt_questions q ON psr.questionId = q.id
WHERE ps.status = 'COMPLETED' AND ps.completedAt > NOW() - INTERVAL '30 days'
ORDER BY ps.id, q.orderIndex;
