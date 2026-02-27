# CBT Session Engine - Architecture Diagrams

## 1. Entity Relationship Diagram (ERD)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           USER MANAGEMENT LAYER                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ ┌─────────────────┐                                                          │
│ │   users         │                                                          │
│ ├─────────────────┤                                                          │
│ │ id (PK)         │                                                          │
│ │ email (UNIQUE)  │                                                          │
│ │ firstName       │                                                          │
│ │ lastName        │                                                          │
│ │ role (ENUM)     │◄────┐                                                    │
│ │ createdAt       │     │                                                    │
│ │ updatedAt       │     │                                                    │
│ └─────────────────┘     │                                                    │
│         ▲               │                                                    │
│         │               │                                                    │
│         └───────────────┘               ┌─────────────────────────────┐      │
│                                         │ TEMPLATE CREATION LAYER     │      │
│                                         └─────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                      SESSION TEMPLATE HIERARCHY                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ ┌────────────────────────────┐                                               │
│ │ CBTSessionTemplate         │  (Version 1)                                  │
│ ├────────────────────────────┤                                               │
│ │ id (PK)                    │                                               │
│ │ therapistId (FK) ─────────►users[therapist]                               │
│ │ title, description         │                                               │
│ │ version (Int)              │                                               │
│ │ status: DRAFT|PUBLISHED..  │                                               │
│ │ category, targetAudience   │                                               │
│ │ estimatedDuration          │                                               │
│ │ publishedAt                │                                               │
│ └────────┬────────────────────┘                                               │
│          │                                                                    │
│ ┌────────▼──────────────────────────┐      ┌──────────────────────────────┐  │
│ │ CBTQuestion              (1:N)     │      │ CBTSessionVersion   (1:N)    │  │
│ ├─────────────────────────────────────┤  ├──────────────────────────────┤  │
│ │ id (PK)                             │  │ id (PK)                      │  │
│ │ sessionId (FK) ───────────►template │  │ sessionId (FK) ───►template  │  │
│ │ type: MULTIPLE_CHOICE|...          │  │ version (Int)                │  │
│ │ prompt, description                 │  │ snapshotData (JSON)          │  │
│ │ orderIndex (UNIQUE +sessionId)      │  │ changeNotes                  │  │
│ │ isRequired, helpText                │  │ createdAt                    │  │
│ │ metadata (JSON - config per type)   │  └──────────────────────────────┘  │
│ │ createdAt, updatedAt                │                                      │
│ │                                     │     ┌──────────────────────────────┐ │
│ │                                     │     │ SessionTemplateLibrary (1:1) │ │
│ │                                     │     ├──────────────────────────────┤ │
│ │                                     │     │ id (PK)                      │ │
│ │                                     │     │ templateId (FK, UNIQUE)      │ │
│ └────────┬──────────────────────────────┐  │ category, tags               │ │
│          │                              │  │ ratings, downloads           │ │
│          │                              │  │ isApproved, approvedBy       │ │
│ ┌────────▼──────────────────────────┐  │  └──────────────────────────────┘ │
│ │ QuestionBranchingRule  (1:N)      │  │                                    │
│ ├─────────────────────────────────────┤  │                                    │
│ │ id (PK)                             │  │  ┌──────────────────────────────┐ │
│ │ fromQuestionId (FK) ─────────┐     │  │  │ PatientResponse (Analytics) │ │
│ │ toQuestionId (FK) ───────────┼─────►  │  ├──────────────────────────────┤ │
│ │ operator (ENUM)              │     │  │  │ id (PK)                      │ │
│ │ conditionValue               │     │  │  │ questionId (FK, UNIQUE)      │ │
│ │ complexCondition (JSON)      │     │  │  │ responseStats (JSON)         │ │
│ │ isActive                     │     │  │  │ totalResponses               │ │
│ │ createdAt                    │     │  │  │ updatedAt                    │ │
│ └─────────────────────────────────┘     │  └──────────────────────────────┘ │
│                                         │                                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                       PATIENT SESSION EXECUTION                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ ┌──────────────────────────────────────────────────────┐                     │
│ │ PatientSession        (Instance of template)          │                     │
│ ├──────────────────────────────────────────────────────┤                     │
│ │ id (PK)                                               │                     │
│ │ patientId (FK) ──────────────────► users[patient]    │                     │
│ │ templateId (FK) ──────────────────► template         │                     │
│ │ templateVersion (locks to version)                   │                     │
│ │ status: NOT_STARTED|IN_PROGRESS|..                   │                     │
│ │ currentQuestionIndex                                  │                     │
│ │ startedAt, completedAt, abandonedAt                  │                     │
│ │ sessionNotes, timestamps                             │                     │
│ └──────────┬───────────────────────────────────────────┘                     │
│            │                                                                  │
│ ┌──────────▼─────────────────────────────┐                                    │
│ │ PatientSessionResponse    (1:N)        │                                    │
│ ├────────────────────────────────────────┤                                    │
│ │ id (PK)                                 │                                    │
│ │ sessionId (FK) ─────────► PatientSession│                                    │
│ │ patientId (FK) ────────────────► users  │                                    │
│ │ questionId (FK) ────────► CBTQuestion   │                                    │
│ │ responseData (JSON - flexible)          │                                    │
│ │ timeSpentSeconds                        │                                    │
│ │ answeredAt                              │                                    │
│ │ previousResponseId (self-ref)           │                                    │
│ │ UNIQUE(sessionId, questionId)           │                                    │
│ └────────────────────────────────────────┘                                    │
│            │                                                                  │
│ ┌──────────▼──────────────────────────────┐                                    │
│ │ SessionExport         (1:N)             │                                    │
│ ├────────────────────────────────────────┤                                    │
│ │ id (PK)                                 │                                    │
│ │ sessionId (FK) ─────► PatientSession    │ (PDF|CSV|JSON)                   │
│ │ format, fileName                        │                                    │
│ │ filePath, fileSize                      │                                    │
│ │ status: PENDING|COMPLETED|FAILED        │                                    │
│ │ expiresAt (30-day retention)            │                                    │
│ └────────────────────────────────────────┘                                    │
│                                                                               │
│ ┌──────────────────────────────────────────────────────┐                     │
│ │ SessionAuditLog          (1:N)                        │                     │
│ ├──────────────────────────────────────────────────────┤                     │
│ │ id (PK)                                               │                     │
│ │ sessionId, userId, action                            │                     │
│ │ entityType, entityId, changes (JSON)                 │                     │
│ │ ipAddress, createdAt                                 │                     │
│ └──────────────────────────────────────────────────────┘                     │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 2. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        THERAPIST TEMPLATE CREATION FLOW                          │
├─────────────────────────────────────────────────────────────────────────────────┤

  1. Create Template (DRAFT)          2. Add Questions (ordered)      3. Configure Branching
┌─────────────────────┐           ┌──────────────────────┐          ┌──────────────┐
│ POST /templates     │           │ POST /questions      │          │ POST /rules  │
│ {                   │           │ {                    │          │ {            │
│  title,             │────────►  │  type,               │  ◄──────│  fromQId,    │
│  description,       │           │  prompt,             │          │  toQId,      │
│  category,          │           │  orderIndex,         │          │  operator,   │
│  duration           │           │  metadata            │          │  condition   │
│ }                   │           │ }                    │          │ }            │
└─────────────────────┘           └──┬───────────────────┘          └──────────────┘
         │                           │                                    │
         │ Creates                   │ Creates                            │ Creates
         ▼                           ▼                                    ▼
    Template (DRAFT)            Question 1 ──┬──────────────────────► Branch Rule 1
                                 Question 2 ──┼──────────────────────► Branch Rule 2
                                 Question 3 ──┤
                                 ...         │
                                             │
                      4. Publish Template ◄──┘
                      ┌──────────────────┐
                      │ PUT /publish     │
                      │ snapshot version │
                      │ lock template    │
                      │ status=PUBLISHED │
                      └────────┬─────────┘
                               │
                               ▼
                          Template (v1, PUBLISHED)
                          [Can now be assigned to patients]


┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PATIENT SESSION EXECUTION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────────┤

    1. Start Session              2. Get Current Question      3. Submit Response
┌────────────────────┐       ┌──────────────────────────┐   ┌────────────────────┐
│ POST /start        │       │ GET /current-question    │   │ POST /respond      │
│ {                  │       │                          │   │ {                  │
│  templateId: X     │──────►│ Returns:                 │   │  questionId,       │
│ }                  │       │ {                        │   │  responseData,     │
└────────────────────┘       │  id, type, prompt,       │   │  timeSpent         │
         │                   │  metadata, options       │   │ }                  │
         │                   │ }                        │   └───────┬────────────┘
         ▼                   └──────────────────────────┘           │
    Create Session                   ▲                              │ Validate response
    status: IN_PROGRESS              │                              │
    currentQuestionIndex: 0           │                              │
         │                           │                              ▼
         │                    Patient fills form          1. Store response
         │                    with answer                 2. Evaluate branching
         │                           │                    3. Determine next question
         └───────────────────────────┘                    4. Update session index
                                                          5. Check if complete

    ┌─────────────────────────────────────────────────────────────┐
    │ BRANCHING LOGIC EVALUATION                                  │
    ├─────────────────────────────────────────────────────────────┤
    │                                                              │
    │ if responseValue EQUALS 'crisis_with_plan':                 │
    │    --> Jump to Crisis Assessment (Q5)                       │
    │ elif responseValue GREATER_THAN 7:                          │
    │    --> Jump to Therapist Referral (Q8)                      │
    │ else:                                                        │
    │    --> Continue to next question in order (Q2)              │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘
    
    ┌────────────────────────────────────────────────────────────┐
    │ SESSION COMPLETION                                          │
    ├────────────────────────────────────────────────────────────┤
    │                                                             │
    │ When currentQuestionIndex >= totalQuestions:               │
    │   1. status = COMPLETED                                    │
    │   2. completedAt = NOW()                                   │
    │   3. Generate summary with timestamps                      │
    │   4. Available for export (PDF/CSV/JSON)                   │
    │                                                             │
    └────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SESSION EXPORT FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────────┤

    Completed Session          Export Request              File Generation
┌──────────────────────┐   ┌────────────────────┐   ┌──────────────────────┐
│ PatientSession       │   │ POST /export/pdf   │   │ 1. Fetch all data    │
│ status: COMPLETED    │──►│ POST /export/csv   │──►│ 2. Format response   │
│ 8 responses stored   │   │ POST /export/json  │   │ 3. Generate file     │
│ 45 min duration      │   └────────────────────┘   │ 4. Store path        │
└──────────────────────┘                            │ 5. Log export        │
                                                     └──────────┬───────────┘
                                                                │
                                        ┌───────────────────────┼──────────────────┐
                                        │                       │                  │
                            ┌───────────▼───────────┐  ┌────────▼──────────┐  ┌───▼──────────┐
                            │ PDF Export            │  │ CSV Export        │  │ JSON Export  │
                            ├───────────────────────┤  ├──────────────────┤  ├──────────────┤
                            │ • Formatted layout    │  │ • One row/answer  │  │ • Structured │
                            │ • Patient-friendly    │  │ • Spreadsheet use │  │ • Machine    │
                            │ • Printable           │  │ • Analytics tools │  │   readable   │
                            │ • Professional        │  │ • BI integration  │  │ • Complete   │
                            └───────────────────────┘  └──────────────────┘  │   metadata   │
                                                                              └──────────────┘

    Storage & Retention
    ┌──────────────────────────────────────────────┐
    │ SessionExport Table                          │
    │ • fileName, filePath                         │
    │ • status: COMPLETED                          │
    │ • expiresAt: (30 days from creation)         │
    │ • Auto-delete after expiration               │
    └──────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ANALYTICS & AGGREGATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────────┤

    All Responses to Question Q1          Aggregation              Analytics Table
┌──────────────────────────────┐   ┌─────────────────────┐   ┌──────────────────┐
│ Response 1: opt_1            │   │ Count occurrences:  │   │ PatientResponse  │
│ Response 2: opt_2            │   │   opt_1: 45         │   ├──────────────────┤
│ Response 3: opt_1            │───►  opt_2: 80         │──►│ questionId       │
│ Response 4: opt_3            │   │   opt_3: 75         │   │ responseStats:   │
│ ....                         │   │   opt_4: 50         │   │ {                │
│ Response 250: opt_2          │   │                     │   │   optionCounts,  │
└──────────────────────────────┘   │ Calculate:          │   │   mostCommon     │
                                   │   Most common       │   │ }                │
    For Slider Questions:          │   Percentages       │   │ totalResponses   │
┌──────────────────────────────┐   └─────────────────────┘   └──────────────────┘
│ Value: 6                     │
│ Value: 8                     │   Stats Calculation:
│ Value: 7                     │   • Average: 6.5
│ Value: 5                     │───► Min: 1, Max: 10
│ ....                         │   • StdDev: 2.1
│ Value: 7                     │   • Median: 7
└──────────────────────────────┘
```

## 3. Question Type Structures

```
MULTIPLE_CHOICE:
┌─────────────────────────────────────────────┐
│ Question:                                   │
│ "How often do you feel anxious?"            │
│                                             │
│ metadata: {                                 │
│   options: [                                │
│     { id: "opt_1", label: "Never",          │
│       value: "never" },                     │
│     { id: "opt_2", label: "Sometimes",      │
│       value: "sometimes" },                 │
│     { id: "opt_3", label: "Often",          │
│       value: "often" },                     │
│     { id: "opt_4", label: "Always",         │
│       value: "always" }                     │
│   ]                                         │
│ }                                           │
│                                             │
│ responseData: {                             │
│   selectedOptionId: "opt_3"                 │
│ }                                           │
└─────────────────────────────────────────────┘


TEXT:
┌─────────────────────────────────────────────┐
│ Question:                                   │
│ "Describe what triggers your anxiety:"      │
│                                             │
│ metadata: {                                 │
│   minLength: 10,                            │
│   maxLength: 500,                           │
│   placeholder: "Enter your response...",    │
│   validationRegex: "^[a-zA-Z\\s]*$"         │
│ }                                           │
│                                             │
│ responseData: {                             │
│   text: "Crowded spaces and public speaking"│
│ }                                           │
└─────────────────────────────────────────────┘


SLIDER:
┌─────────────────────────────────────────────┐
│ Question:                                   │
│ "Rate your anxiety (0-10)"                  │
│                                             │
│ metadata: {                                 │
│   min: 0,                                   │
│   max: 10,                                  │
│   step: 1,                                  │
│   labels: {                                 │
│     min: "No anxiety",                      │
│     mid: "Moderate",                        │
│     max: "Severe anxiety"                   │
│   }                                         │
│ }                                           │
│                                             │
│ responseData: {                             │
│   value: 7,                                 │
│   min: 0,                                   │
│   max: 10                                   │
│ }                                           │
└─────────────────────────────────────────────┘


CHECKBOX (Multiple Selection):
┌─────────────────────────────────────────────┐
│ Question:                                   │
│ "Select all symptoms you experience:"       │
│                                             │
│ metadata: {                                 │
│   options: [                                │
│     { id: "opt_1", label: "Heart pounding" },│
│     { id: "opt_2", label: "Shortness of breath"},│
│     { id: "opt_3", label: "Dizziness" },   │
│     { id: "opt_4", label: "Sweating" }     │
│   ]                                         │
│ }                                           │
│                                             │
│ responseData: {                             │
│   selectedOptions: ["opt_1", "opt_3", "opt_4"]│
│ }                                           │
└─────────────────────────────────────────────┘
```

## 4. Branching Logic Examples

```
EXAMPLE 1: Simple Equals Branching
┌────────────────────────────────────────────────────┐
│ Question Q1: "Have you had suicidal thoughts?"     │
│ (Options: "Never", "Sometimes", "Often", "Daily")  │
│                                                    │
│ If answer = "Daily"                               │
│    └─► Jump to Q_CRISIS (Emergency Assessment)    │
│ Otherwise                                          │
│    └─► Continue to Q2                             │
└────────────────────────────────────────────────────┘


EXAMPLE 2: Slider - Greater Than Branching
┌────────────────────────────────────────────────────┐
│ Question Q3: "Rate symptom severity (0-10)"        │
│                                                    │
│ If score >= 8                                      │
│    └─► Jump to Q_SEVERE (Advanced Assessment)     │
│ Elif score >= 5                                    │
│    └─► Jump to Q_MODERATE (Standard Assessment)   │
│ Else                                               │
│    └─► Jump to Q_MILD (Basic Follow-up)           │
└────────────────────────────────────────────────────┘


EXAMPLE 3: Complex AND Conditions
┌──────────────────────────────────────────────────────────┐
│ Question Q5: "Do you have suicidal thoughts?"            │
│ Answer: "Yes"                                            │
│                                                          │
│ AND Question Q6: "Do you have a plan?"                   │
│ Answer: "Yes"                                            │
│                                                          │
│ ╔═══════════════════════════════════════════════════╗   │
│ ║ CRITICAL: Jump immediately to CRISIS_HOTLINE     ║   │
│ ║ Display emergency services contact information   ║   │
│ ║ Skip remaining assessment questions               ║   │
│ ╚═══════════════════════════════════════════════════╝   │
└──────────────────────────────────────────────────────────┘
```

## 5. Scalability Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    CURRENT: Single Instance                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Backend API ◄──────────► PostgreSQL Database                  │
│                           (All reads & writes)                 │
│                                                                 │
└────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│              GROWTH PHASE: Read Replicas + Caching              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Backend API                                                   │
│    ├─ Write Pool ◄──→ PostgreSQL Primary (Templates)          │
│    ├─ Read Pool  ◄──→ PostgreSQL Replica 1 (Analytics)        │
│    ├─ Read Pool  ◄──→ PostgreSQL Replica 2 (Reports)          │
│    └─ Cache      ◄──→ Redis (Templates, Sessions, Responses)  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│         ENTERPRISE PHASE: Partitioning + Distributed Cache     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Load Balancer                                                 │
│    ├─► API-1 ─────┐                                             │
│    ├─► API-2 ─────┼──────────► PostgreSQL Primary              │
│    └─► API-3 ─────┤            (Write Master)                  │
│                   │                                             │
│                   ├──────────► Read Replica 1                  │
│                   ├──────────► Read Replica 2                  │
│                   └──────────► Read Replica 3                  │
│                                                                 │
│   Redis Cluster (Distributed Cache)                            │
│   ├─ Node 1: Template data                                     │
│   ├─ Node 2: Active sessions                                   │
│   └─ Node 3: Response analytics                                │
│                                                                 │
│   Table Partitioning (for >100M rows):                         │
│   ├─ patient_session_responses (partitioned by date range)     │
│   └─ session_audit_logs (partitioned by month)                 │
│                                                                 │
│   Async Processing:                                            │
│   ├─ Export job queue (PDF/CSV/JSON generation)               │
│   ├─ Analytics calculation queue                              │
│   └─ Notification queue                                       │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

This comprehensive documentation provides visual references for understanding the CBT Session Engine architecture, data flows, and scalability considerations.
