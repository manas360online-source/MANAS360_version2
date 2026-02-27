# CBT Session Engine - Quick Start Guide

## 📦 Installation & Setup

### 1. Install Dependencies

Add required packages to `backend/package.json`:

```bash
npm install pdfkit fast-csv date-fns redis
npm install -D @types/pdfkit
```

### 2. Run Database Migration

```bash
# From project root
cd backend

# Generate Prisma client with new models
npx prisma generate

# Run the migration
npx prisma migrate deploy

# (Optional) Seed demo data
npx ts-node prisma/seed.ts
```

### 3. Environment Variables

Add to `.env`:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/manas360_cbt"

# File Storage
EXPORT_STORAGE_PATH="./exports"
AWS_S3_BUCKET="manas360-exports" # Optional for S3 storage

# Features
ENABLE_PDF_EXPORT=true
ENABLE_CSV_EXPORT=true
ENABLE_JSON_EXPORT=true
EXPORT_RETENTION_DAYS=30
```

### 4. Start Backend Server

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

---

## 🚀 API Usage Examples

### Create a CBT Template

```bash
curl -X POST http://localhost:3000/api/v1/cbt-sessions/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Anxiety Screening Assessment",
    "description": "GAD-7 based screening",
    "category": "Anxiety",
    "estimatedDuration": 10
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "tpl_abc123",
    "title": "Anxiety Screening Assessment",
    "version": 1,
    "status": "DRAFT",
    "therapistId": "user_123",
    "createdAt": "2024-02-27T10:00:00Z"
  }
}
```

### Add Questions to Template

```bash
curl -X POST http://localhost:3000/api/v1/cbt-sessions/templates/tpl_abc123/questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MULTIPLE_CHOICE",
    "prompt": "How often do you feel anxious?",
    "orderIndex": 0,
    "isRequired": true,
    "metadata": {
      "options": [
        { "id": "opt_1", "label": "Not at all", "value": "none" },
        { "id": "opt_2", "label": "Several days a week", "value": "several" },
        { "id": "opt_3", "label": "More than half the days", "value": "frequent" },
        { "id": "opt_4", "label": "Nearly every day", "value": "daily" }
      ]
    }
  }'
```

### Add Follow-up Question with Branching

```bash
# First, create the follow-up question
curl -X POST http://localhost:3000/api/v1/cbt-sessions/templates/tpl_abc123/questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SLIDER",
    "prompt": "Rate your anxiety level (0-10)",
    "orderIndex": 1,
    "metadata": { "min": 0, "max": 10, "step": 1 }
  }'

# Response: question with id "q_2"

# Create branching rule
curl -X POST http://localhost:3000/api/v1/cbt-sessions/branching-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromQuestionId": "q_1",
    "toQuestionId": "q_2",
    "operator": "NOT_EQUALS",
    "conditionValue": "none"
  }'
```

### Publish Template

```bash
curl -X PUT http://localhost:3000/api/v1/cbt-sessions/templates/tpl_abc123/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Patient Starts Session

```bash
curl -X POST http://localhost:3000/api/v1/cbt-sessions/start \
  -H "Authorization: Bearer PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "tpl_abc123"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "sessionId": "sess_xyz789",
#     "currentQuestion": {
#       "id": "q_1",
#       "type": "MULTIPLE_CHOICE",
#       "prompt": "How often do you feel anxious?",
#       "metadata": { "options": [...] }
#     }
#   }
# }
```

### Patient Responds to Question

```bash
curl -X POST http://localhost:3000/api/v1/cbt-sessions/sess_xyz789/respond \
  -H "Authorization: Bearer PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "q_1",
    "responseData": { "selectedOptionId": "opt_3" },
    "timeSpentSeconds": 45
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "nextQuestionId": "q_2",
#     "sessionComplete": false,
#     "nextQuestion": {
#       "id": "q_2",
#       "type": "SLIDER",
#       "prompt": "Rate your anxiety level..."
#     }
#   }
# }
```

### Get Session Summary

```bash
curl -X GET http://localhost:3000/api/v1/cbt-sessions/sess_xyz789/summary \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response includes all responses with timestamps, time spent per question, etc.
```

### Export Session

```bash
# Export as PDF
curl -X POST http://localhost:3000/api/v1/cbt-sessions/sess_xyz789/export/pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output session.pdf

# Export as CSV
curl -X POST http://localhost:3000/api/v1/cbt-sessions/sess_xyz789/export/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output session.csv

# Export as JSON
curl -X POST http://localhost:3000/api/v1/cbt-sessions/sess_xyz789/export/json \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output session.json
```

### Get Question Analytics

```bash
curl -X GET http://localhost:3000/api/v1/cbt-sessions/questions/q_1/analytics \
  -H "Authorization: Bearer THERAPIST_TOKEN"

# Response:
# {
#   "success": true,
#   "data": {
#     "questionId": "q_1",
#     "totalResponses": 250,
#     "analytics": {
#       "optionCounts": {
#         "opt_1": 45,
#         "opt_2": 80,
#         "opt_3": 75,
#         "opt_4": 50
#       },
#       "mostCommon": "opt_2"
#     }
#   }
# }
```

### Get Template Statistics

```bash
curl -X GET http://localhost:3000/api/v1/cbt-sessions/templates/tpl_abc123/stats \
  -H "Authorization: Bearer THERAPIST_TOKEN"

# Response:
# {
#   "success": true,
#   "data": {
#     "templateId": "tpl_abc123",
#     "totalSessions": 500,
#     "completedSessions": 425,
#     "completionRate": 85,
#     "averageQuestionsAnswered": 18.5
#   }
# }
```

---

## 📐 Template Structure Example

### Anxiety Assessment Template

```json
{
  "id": "tpl_anxiety_001",
  "title": "GAD-7 Anxiety Assessment",
  "description": "Generalized Anxiety Disorder 7-item screener",
  "version": 1,
  "status": "PUBLISHED",
  "category": "Anxiety",
  "estimatedDuration": 10,
  "questions": [
    {
      "id": "q_1",
      "orderIndex": 0,
      "type": "MULTIPLE_CHOICE",
      "prompt": "Over the last two weeks, how often have you felt nervous, anxious, or on edge?",
      "metadata": {
        "options": [
          { "id": "opt_0", "label": "Not at all", "value": 0 },
          { "id": "opt_1", "label": "Several days", "value": 1 },
          { "id": "opt_2", "label": "More than half the days", "value": 2 },
          { "id": "opt_3", "label": "Nearly every day", "value": 3 }
        ]
      }
    },
    {
      "id": "q_2",
      "orderIndex": 1,
      "type": "MULTIPLE_CHOICE",
      "prompt": "How often have you been unable to stop or control worrying?",
      "metadata": {
        "options": [
          { "id": "opt_0", "label": "Not at all", "value": 0 },
          { "id": "opt_1", "label": "Several days", "value": 1 },
          { "id": "opt_2", "label": "More than half the days", "value": 2 },
          { "id": "opt_3", "label": "Nearly every day", "value": 3 }
        ]
      }
    },
    {
      "id": "q_final",
      "orderIndex": 7,
      "type": "SLIDER",
      "prompt": "Overall, how much has anxiety impacted your life? (0-10)",
      "metadata": {
        "min": 0,
        "max": 10,
        "labels": { "min": "No impact", "max": "Severe impact" }
      }
    }
  ],
  "branchingRules": [
    {
      "fromQuestionId": "q_1",
      "toQuestionId": "q_crisis",
      "operator": "EQUALS",
      "conditionValue": "opt_3", // "Nearly every day"
      // Skip to crisis assessment if severe anxiety
    }
  ]
}
```

---

## 🧪 Testing

### Run Test Suite

```bash
npm run test -- --testPathPattern=cbt-session

# Watch mode
npm run test:watch -- --testPathPattern=cbt-session
```

### Example Unit Test

```typescript
import { cbtSessionService } from '../services/cbt-session.service';

describe('CBT Session Service', () => {
  it('should create template and add questions', async () => {
    const template = await cbtSessionService.createTemplate(therapistId, {
      title: 'Test Template',
      category: 'Test',
    });

    expect(template.id).toBeDefined();
    expect(template.status).toBe('DRAFT');
    expect(template.version).toBe(1);
  });

  it('should evaluate branching logic correctly', async () => {
    const nextQuestion = await cbtSessionService.evaluateBranchingLogic(
      'q_1',
      { selectedOptionId: 'opt_crisis' }
    );

    expect(nextQuestion).toBe('q_crisis');
  });

  it('should record response and advance session', async () => {
    const result = await cbtSessionService.recordResponse(
      sessionId,
      patientId,
      'q_1',
      { selectedOptionId: 'opt_2' },
      45
    );

    expect(result.nextQuestionId).toBeDefined();
    expect(result.sessionComplete).toBe(false);
  });
});
```

---

## 📊 Performance Tuning

### Database Optimization

```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM cbt_questions 
WHERE sessionId = 'tpl_abc123' 
ORDER BY orderIndex;

-- Rebuild indexes after bulk inserts
REINDEX TABLE cbt_questions;
REINDEX TABLE patient_session_responses;

-- Analyze table statistics
ANALYZE cbt_session_templates;
```

### Redis Caching

```typescript
// Cache template structure
const cacheKey = `template:${templateId}:v${version}`;
let template = await redis.get(cacheKey);

if (!template) {
  template = await cbtSessionService.getTemplateWithQuestions(templateId);
  await redis.set(cacheKey, JSON.stringify(template), 'EX', 3600);
}

return JSON.parse(template);
```

---

## 🔒 Security Checklist

- [ ] Therapist can only access own templates
- [ ] Patients can only access assigned sessions
- [ ] Admin has full audit trail access
- [ ] Session exports are encrypted
- [ ] Exports auto-delete after 30 days
- [ ] IP logging on sensitive operations
- [ ] Rate limiting on API endpoints
- [ ] Input validation on all endpoints

---

## 📞 Troubleshooting

### Common Issues

**Issue:** Prisma client not generating
```bash
npx prisma generate
npx prisma db push
```

**Issue:** Migration conflicts
```bash
# Reset database (dev only!)
npx prisma migrate reset
```

**Issue:** Branching logic not working
```typescript
// Debug: Log evaluated condition
console.log('Rule:', rule);
console.log('Response:', responseValue);
console.log('Match:', this.evaluateCondition(rule, responseValue));
```

**Issue:** Slow analytics queries
```sql
-- Check table size
SELECT 
  relname, 
  pg_size_pretty(pg_total_relation_size(relid)) 
FROM pg_stat_user_tables 
ORDER BY pg_total_relation_size(relid) DESC;
```

---

## 📚 Next Steps

1. **Template Library:** Add public template sharing system
2. **AI Insights:** Generate therapy insights from responses
3. **Mobile App:** React Native client for patient sessions
4. **Video Integration:** Embed therapist guidance videos in sessions
5. **HIPAA Compliance:** Full compliance documentation
6. **Advanced Analytics:** ML-based pattern detection

---

## 📖 Documentation References

- [Prisma Schema Docs](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/index.html)

**Last Updated:** February 27, 2024
