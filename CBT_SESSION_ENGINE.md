# CBT Session Engine - Architecture & Implementation Guide

## 📋 Overview

A comprehensive PostgreSQL-based Cognitive Behavioral Therapy (CBT) Session Engine supporting:
- Dynamic question templates with versioning
- Intelligent branching logic
- Patient response tracking
- Session analytics
- Multi-format exports (PDF/CSV/JSON)

---

## 🗄️ Database Schema Design

### Core Tables & Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│ USER MANAGEMENT (users)                                         │
├─────────────────────────────────────────────────────────────────┤
│ ├─ id (PK)                                                      │
│ ├─ email (UNIQUE INDEX)                                      │
│ ├─ firstName, lastName                                       │
│ ├─ role: PATIENT | THERAPIST | ADMIN (INDEX)               │
│ └─ timestamps                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Template Hierarchy

```
CBTSessionTemplate (version-aware sessions)
├─ id, therapistId (FK → users)
├─ title, description, category
├─ status: DRAFT | PUBLISHED | ARCHIVED | DEPRECATED
├─ version (Integer, incrementing)
├─ publishedAt, timestamps
│
├─ 1:N CBTQuestion (ordered questions)
│   ├─ id, sessionId (FK)
│   ├─ type: MULTIPLE_CHOICE | TEXT | SLIDER | CHECKBOX
│   ├─ prompt, description, helpText
│   ├─ orderIndex (UNIQUE [(sessionId, orderIndex)])
│   ├─ isRequired, metadata (JSON - config per type)
│   │
│   └─ 1:N QuestionBranchingRule (branching logic)
│       ├─ fromQuestionId, toQuestionId (FKs)
│       ├─ operator: EQUALS | NOT_EQUALS | CONTAINS | GT | LT | IN_ARRAY
│       ├─ conditionValue, complexCondition (JSON - AND logic)
│       └─ isActive
│
├─ 1:N CBTSessionVersion (version history)
│   ├─ version, snapshotData (JSON - full template state)
│   └─ changeNotes
│
└─ 1:N SessionTemplateLibrary (public library)
    ├─ category, tags (array), ratings
    └─ isApproved, approvedBy
```

### Patient Session Flow

```
PatientSession (instance of a template)
├─ id, patientId (FK), templateId (FK), templateVersion (lock)
├─ status: NOT_STARTED | IN_PROGRESS | COMPLETED | ABANDONED | PAUSED
├─ currentQuestionIndex, startedAt, completedAt, abandonedAt
│
├─ 1:N PatientSessionResponse (answers)
│   ├─ sessionId, patientId, questionId (FKs)
│   ├─ responseData (JSON - flexible per type)
│   ├─ timeSpentSeconds
│   ├─ answeredAt, previousResponseId (self-referential for follow-ups)
│   │
│   └─ M:N PatientResponse (analytics aggregation)
│       ├─ questionId (UNIQUE)
│       ├─ responseStats (JSON - aggregated data)
│       └─ totalResponses
│
└─ 1:N SessionExport (PDF/CSV/JSON exports)
    ├─ format, filePath, status
    └─ expiresAt (for temporary files)
```

---

## 📊 Index Strategy

### Performance Optimization

| Table | Index | Purpose |
|-------|-------|---------|
| `users` | `(email)` | User lookup |
| `users` | `(role)` | Filter by role |
| `cbt_session_templates` | `(therapistId)` | Therapist's templates |
| `cbt_session_templates` | `(status)` | Published vs draft |
| `cbt_session_templates` | `(category)` | Template discovery |
| `cbt_session_templates` | `(createdAt)` | Recent templates |
| `cbt_session_templates` | FULLTEXT `(title, description)` | Template search |
| `cbt_questions` | `(sessionId, orderIndex)` | Question ordering |
| `question_branching_rules` | `(fromQuestionId, toQuestionId)` | Branching evaluation |
| `patient_sessions` | `(patientId, status)` | Patient's sessions |
| `patient_sessions` | `(templateId, status)` | Template usage stats |
| `patient_session_responses` | `(sessionId, questionId)` | UNIQUE - prevent duplicates |
| `patient_session_responses` | `(patientId, answeredAt)` | Patient timeline |
| `session_exports` | `(sessionId, status)` | Export history |

### Query Optimization

```sql
-- Fast: Get all questions for a template
SELECT * FROM cbt_questions 
WHERE sessionId = $1 
ORDER BY orderIndex ASC;

-- Fast: Get patient's active sessions
SELECT * FROM patient_sessions 
WHERE patientId = $1 AND status IN ('IN_PROGRESS', 'PAUSED')
ORDER BY createdAt DESC;

-- Fast: Branching evaluation (single jump)
SELECT toQuestionId FROM question_branching_rules
WHERE fromQuestionId = $1 AND conditionValue = $2 AND isActive = true
LIMIT 1;

-- Fast: Analytics aggregation (indexed question lookup)
SELECT responseStats FROM patient_responses
WHERE questionId = $1;
```

---

## 🔧 Prisma Models

### Key Enums

```typescript
enum QuestionType {
  MULTIPLE_CHOICE  // Single selection
  TEXT             // Open-ended
  SLIDER           // Numeric scale
  CHECKBOX         // Multiple selection
}

enum BranchingConditionOperator {
  EQUALS           // answer === value
  NOT_EQUALS       // answer !== value
  CONTAINS         // answer includes value
  GREATER_THAN     // answer > value
  LESS_THAN        // answer < value
  IN_ARRAY         // answer in [values]
}
```

### Question Metadata Structure (JSON)

```typescript
// MULTIPLE_CHOICE
{
  options: [
    { id: string, label: string, value: any }
  ]
}

// SLIDER
{
  min: number,
  max: number,
  step: number,
  labels?: { min?: string, mid?: string, max?: string }
}

// CHECKBOX
{
  options: [
    { id: string, label: string, value: any }
  ]
}

// TEXT
{
  minLength?: number,
  maxLength?: number,
  placeholder?: string,
  validationRegex?: string
}
```

### Response Data Structure (JSON)

```typescript
// MULTIPLE_CHOICE
{ selectedOptionId: "opt_123" }

// SLIDER
{ value: 7, min: 0, max: 10 }

// CHECKBOX
{ selectedOptions: ["opt_1", "opt_2"] }

// TEXT
{ text: "Patient's response text" }
```

---

## 🎯 Key Features

### 1. Intelligent Branching Logic

```typescript
// If patient answers "Yes, with plan" → go to Crisis page
await cbtSessionService.createBranchingRule(
  questionId,
  crisisQuestionId,
  {
    operator: 'EQUALS',
    conditionValue: 'suicide_with_plan',
  }
);

// Complex logic: Multiple conditions (AND)
{
  complexCondition: {
    conditions: [
      { operator: 'EQUALS', value: 'anxiety' },
      { operator: 'GREATER_THAN', value: '7' }
    ]
  }
}
```

### 2. Session Versioning

- Templates lock to specific version when session starts
- Therapist can update template without affecting ongoing sessions
- Version history preserved with full snapshots

```typescript
// Create new version for editing
await cbtSessionService.createNewVersion(templateId, "Added crisis screening");

// Existing sessions continue with original version
// New sessions use new version
```

### 3. Patient Response Tracking

- Multi-type response support (choice, text, numeric, array)
- Time-spent analytics per question
- Follow-up response linking for adaptive sessions
- Full session replay capability

### 4. Analytics & Insights

```typescript
// Question-level analytics
{
  questionId: "q_123",
  totalResponses: 250,
  analytics: {
    // For MULTIPLE_CHOICE/CHECKBOX
    optionCounts: { opt_1: 100, opt_2: 150 },
    mostCommon: "opt_2",
    
    // For SLIDER
    average: 6.5,
    min: 1,
    max: 10,
    median: 7,
    
    // For TEXT
    averageLength: 47,
    samples: ["sample 1", "sample 2", ...]
  }
}

// Template usage statistics
{
  templateId: "tpl_123",
  totalSessions: 500,
  completedSessions: 425,
  completionRate: 85%,
  averageQuestionsAnswered: 18.5
}
```

### 5. Multi-Format Exports

All exports include:
- Session metadata (patient, dates, status)
- All questions with question types
- Patient responses with timestamps
- Time-spent analytics
- Summary statistics

**PDF Export:**
- Formatted for printing
- Branded header/footer
- Page breaks for readability
- Patient-friendly layout

**CSV Export:**
- One row per response
- Suitable for analytics tools (Tableau, Power BI)
- Compatible with spreadsheet applications

**JSON Export:**
- Complete structured data
- API-ready format
- Suitable for programmatic processing

---

## 📈 API Endpoints

### Template Management
```
POST   /api/cbt-sessions/templates
GET    /api/cbt-sessions/templates/:id
PUT    /api/cbt-sessions/templates/:id/publish
POST   /api/cbt-sessions/templates/:id/new-version
GET    /api/cbt-sessions/templates/:id/history
```

### Question Management
```
POST   /api/cbt-sessions/templates/:id/questions
PUT    /api/cbt-sessions/questions/:id
DELETE /api/cbt-sessions/questions/:id
```

### Branching Logic
```
POST   /api/cbt-sessions/branching-rules
```

### Patient Sessions
```
POST   /api/cbt-sessions/start
GET    /api/cbt-sessions/:id/current-question
POST   /api/cbt-sessions/:id/respond
GET    /api/cbt-sessions/:id/summary
PUT    /api/cbt-sessions/:id/status
```

### Analytics
```
GET    /api/cbt-sessions/questions/:id/analytics
GET    /api/cbt-sessions/templates/:id/stats
```

### Exports
```
POST   /api/cbt-sessions/:id/export/pdf
POST   /api/cbt-sessions/:id/export/csv
POST   /api/cbt-sessions/:id/export/json
GET    /api/cbt-sessions/:id/exports
```

---

## 🚀 Scalability Considerations

### 1. Partitioning Strategy

For > 10M patient responses, partition `patient_session_responses`:

```sql
-- Partition by date range
CREATE TABLE patient_session_responses_2024_q1 
PARTITION OF patient_session_responses
FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

-- Or partition by patient ID range
CREATE TABLE patient_session_responses_range_1
PARTITION OF patient_session_responses
FOR VALUES FROM (MINVALUE) TO ('50000000');
```

### 2. Read Replicas

- Offload analytics queries to read replicas
- Use read replicas for audit logs
- Keep write operations on primary

### 3. Caching Strategy

```typescript
// Redis cache for frequently accessed templates
redis.set(`template:${id}:v${version}`, template, 'EX', 3600);

// Cache template search results
redis.set(`templates:category:${category}`, results, 'EX', 1800);

// Session response caching (TTL: session duration)
redis.set(`session:${sessionId}:responses`, responses, 'EX', 86400);
```

### 4. Archival Strategy

Move old data to cold storage:

```sql
-- Archive completed sessions older than 1 year
INSERT INTO patient_sessions_archive 
SELECT * FROM patient_sessions 
WHERE completedAt < NOW() - INTERVAL '1 year';

DELETE FROM patient_sessions 
WHERE completedAt < NOW() - INTERVAL '1 year';
```

### 5. Query Optimization

```typescript
// Lazy-load responses (paginated)
async getSessionResponses(sessionId: string, page: number = 1) {
  const pageSize = 20;
  return prisma.patientSessionResponse.findMany({
    where: { sessionId },
    include: { question: true },
    orderBy: { answeredAt: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}

// Denormalize hot data
// Store response count on PatientSession to avoid COUNT queries
template.questionsAnswered // Incremented with each response
```

### 6. Async Processing

```typescript
// Queue exports for large datasets
queue.add('export-session', { sessionId, format: 'PDF' });

// Batch analytics calculations
queue.add('calculate-analytics', { questionId }, { 
  repeat: { cron: '0 2 * * *' } // Daily at 2 AM
});
```

---

## 🔐 Security Considerations

1. **Access Control:**
   - Therapist: Can only access own templates + assigned patients
   - Patient: Can only access assigned sessions
   - Admin: Full access + audit logs

2. **Data Privacy:**
   - Encrypt patient responses at rest
   - Hash email addresses in exports
   - HIPAA compliance for exports
   - Automatic deletion of exports after 30 days

3. **Audit Trail:**
   - `SessionAuditLog` tracks all changes
   - IP logging for session creation
   - Immutable version snapshots

---

## 📝 Usage Examples

### Create Template with Questions

```typescript
// 1. Create template
const template = await cbtSessionService.createTemplate(therapistId, {
  title: 'Anxiety Assessment',
  category: 'Anxiety',
  estimatedDuration: 15,
});

// 2. Add questions in order
const q1 = await cbtSessionService.addQuestion(template.id, {
  type: 'MULTIPLE_CHOICE',
  prompt: 'Over the past two weeks, how often have you felt anxious?',
  orderIndex: 0,
  metadata: {
    options: [
      { id: 'opt_1', label: 'Not at all', value: 'none' },
      { id: 'opt_2', label: 'Several days', value: 'several' },
      { id: 'opt_3', label: 'More than half the days', value: 'frequent' },
      { id: 'opt_4', label: 'Nearly every day', value: 'constant' },
    ],
  },
});

// 3. Add follow-up with branching
const q2 = await cbtSessionService.addQuestion(template.id, {
  type: 'SLIDER',
  prompt: 'Rate your anxiety severity (0-10)',
  orderIndex: 1,
  metadata: { min: 0, max: 10 },
});

// 4. Set up branching
await cbtSessionService.createBranchingRule(q1.id, q2.id, {
  operator: 'NOT_EQUALS',
  conditionValue: 'none',
});

// 5. Publish template
await cbtSessionService.publishTemplate(template.id);
```

### Patient Session Flow

```typescript
// 1. Start session
const session = await cbtSessionService.startPatientSession(patientId, templateId);

// 2. Get first question
let currentQuestion = await cbtSessionService.getCurrentQuestion(session.id);

// 3. Patient responds
const response = await cbtSessionService.recordResponse(
  session.id,
  patientId,
  currentQuestion.id,
  { selectedOptionId: 'opt_3' },
  45 // seconds spent
);

// 4. Get next question (might be branched)
currentQuestion = await cbtSessionService.getCurrentQuestion(session.id);

// 5. On completion
if (response.sessionComplete) {
  const summary = await cbtSessionService.getSessionSummary(session.id);
  
  // Export as PDF
  const pdfPath = await sessionExportService.exportToPDF(session.id);
}
```

---

## 🧪 Testing

```typescript
// Unit test example
describe('CBTSessionService', () => {
  it('should evaluate branching logic correctly', async () => {
    const nextQuestionId = await cbtSessionService.evaluateBranchingLogic(
      questionId,
      { selectedOptionId: 'opt_critical' }
    );
    
    expect(nextQuestionId).toBe(crisisQuestionId);
  });

  it('should prevent session completion without all questions', async () => {
    expect(
      cbtSessionService.recordResponse(sessionId, patientId, q1.id, responseData)
    ).rejects.toThrow('Session incomplete');
  });
});
```

---

## 📞 Support

For questions or optimization recommendations, consult:
- Database performance analysis tools (EXPLAIN ANALYZE)
- Prisma query optimization guide
- PostgreSQL partitioning docs
