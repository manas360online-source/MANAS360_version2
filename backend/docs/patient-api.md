# Patient API Documentation

Base URL: `/api/v1/patients`

Authentication: Bearer JWT (`Authorization: Bearer <access_token>`)

Role restriction: `patient` only (all endpoints below)

---

## Endpoint Matrix

| Endpoint | Method | Auth Required | Role Restriction |
|---|---|---|---|
| `/api/v1/patients/profile` | POST | Yes | patient |
| `/api/v1/patients/me/profile` | GET | Yes | patient |
| `/api/v1/patients/me/assessments` | POST | Yes | patient |
| `/api/v1/patients/me/assessments` | GET | Yes | patient |
| `/api/v1/patients/me/mood-history` | GET | Yes | patient |
| `/api/v1/patients/me/therapist-matches` | GET | Yes | patient |
| `/api/v1/patients/me/sessions/book` | POST | Yes | patient |
| `/api/v1/patients/me/sessions` | GET | Yes | patient |

---

## 1) Create Patient Profile

**Endpoint**: `/api/v1/patients/profile`  
**Method**: `POST`

### Request Body Schema

```json
{
  "age": 29,
  "gender": "female",
  "medicalHistory": "Mild insomnia",
  "emergencyContact": {
    "name": "Asha",
    "relation": "sister",
    "phone": "+919999999999"
  }
}
```

### Validation Rules

- `age`: integer, `1..120`
- `gender`: one of `male | female | other | prefer_not_to_say`
- `medicalHistory`: optional string, max length `2000`
- `emergencyContact`: required object
- `emergencyContact.name`: string length `2..100`
- `emergencyContact.relation`: string length `2..50`
- `emergencyContact.phone`: E.164 format (`^\+?[1-9]\d{1,14}$`)

### Sample Success Response

```json
{
  "success": true,
  "message": "Patient profile created",
  "data": {
    "_id": "67c4...",
    "userId": "67c3...",
    "age": 29,
    "gender": "female",
    "medicalHistory": "Mild insomnia",
    "emergencyContact": {
      "name": "Asha",
      "relation": "sister",
      "phone": "+919999999999"
    },
    "createdAt": "2026-02-27T10:10:00.000Z",
    "updatedAt": "2026-02-27T10:10:00.000Z"
  }
}
```

### Error Codes

- `401` Authentication required
- `403` Patient role required
- `404` User not found
- `409` Profile already exists
- `422` Validation failed

---

## 2) Get My Profile

**Endpoint**: `/api/v1/patients/me/profile`  
**Method**: `GET`

### Request Body Schema

- None

### Validation Rules

- Auth token required
- Caller must have `patient` role

### Sample Success Response

```json
{
  "success": true,
  "message": "Patient profile fetched",
  "data": {
    "userId": "67c3...",
    "age": 29,
    "gender": "female",
    "medicalHistory": "Mild insomnia",
    "emergencyContact": {
      "name": "Asha",
      "relation": "sister",
      "phone": "+919999999999"
    }
  }
}
```

### Error Codes

- `401`, `403`, `404`

---

## 3) Submit Assessment

**Endpoint**: `/api/v1/patients/me/assessments`  
**Method**: `POST`

### Request Body Schema

```json
{
  "type": "PHQ-9",
  "answers": [2, 2, 1, 1, 1, 1, 1, 0, 0]
}
```

### Validation Rules

- `type`: `PHQ-9` or `GAD-7`
- `answers`: array of integers in `0..3`
- For `PHQ-9`, exactly `9` answers
- For `GAD-7`, exactly `7` answers

### Sample Success Response

```json
{
  "success": true,
  "message": "Assessment submitted",
  "data": {
    "type": "PHQ-9",
    "answers": [2, 2, 1, 1, 1, 1, 1, 0, 0],
    "totalScore": 9,
    "severityLevel": "mild",
    "createdAt": "2026-02-27T10:15:00.000Z"
  }
}
```

### Error Codes

- `401`, `403`, `404`, `422`

---

## 4) Fetch Assessment History

**Endpoint**: `/api/v1/patients/me/assessments`  
**Method**: `GET`

### Request Body Schema

- None (query params only)

### Validation Rules

- `type` (optional): `PHQ-9 | GAD-7`
- `fromDate`, `toDate` (optional): ISO8601 date
- `fromDate <= toDate`
- `page` optional integer `>=1`
- `limit` optional integer `1..50`

### Sample Success Response

```json
{
  "success": true,
  "message": "Assessment history fetched",
  "data": {
    "items": [
      {
        "type": "GAD-7",
        "answers": [2, 1, 1, 1, 1, 0, 0],
        "totalScore": 6,
        "severityLevel": "mild",
        "createdAt": "2026-02-27T10:16:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "totalItems": 2,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### Error Codes

- `401`, `403`, `404`, `422`

---

## 5) Fetch Mood History

**Endpoint**: `/api/v1/patients/me/mood-history`  
**Method**: `GET`

### Request Body Schema

- None (query params only)

### Validation Rules

- `fromDate`, `toDate` (optional): ISO8601 date
- `fromDate <= toDate`

### Sample Success Response

```json
{
  "success": true,
  "message": "Mood history fetched",
  "data": {
    "items": [
      {
        "moodScore": 7,
        "note": "Better day",
        "date": "2026-02-26T10:00:00.000Z"
      }
    ],
    "grouped": {
      "week": [
        {
          "period": "2026-W09",
          "averageMoodScore": 6.5,
          "entryCount": 2
        }
      ],
      "month": [
        {
          "period": "2026-02",
          "averageMoodScore": 6.5,
          "entryCount": 2
        }
      ]
    },
    "trend": {
      "trend": "improving",
      "delta": 1.5
    }
  }
}
```

### Error Codes

- `401`, `403`, `404`, `422`

---

## 6) Therapist Match Endpoint

**Endpoint**: `/api/v1/patients/me/therapist-matches`  
**Method**: `GET`

### Request Body Schema

- None (query params only)

### Validation Rules

- `languagePreference` optional string length `2..50`
- `specializationPreference` optional string length `2..80`
- `nextHours` optional integer `1..336` (default `72`)

### Sample Success Response

```json
{
  "success": true,
  "message": "Therapist matches fetched",
  "data": {
    "algorithm": {
      "version": "v1",
      "weights": {
        "severity": 0.35,
        "specialization": 0.3,
        "language": 0.2,
        "availability": 0.15
      },
      "formula": "compatibility = 100 * (0.35*severity + 0.30*specialization + 0.20*language + 0.15*availability)"
    },
    "matches": [
      {
        "therapist": {
          "id": "67c5...",
          "displayName": "Dr. Priya Rao",
          "specializations": ["anxiety", "cbt"],
          "languages": ["english", "hindi"],
          "yearsOfExperience": 8,
          "averageRating": 4.8
        },
        "compatibilityScore": 91.5,
        "scoreBreakdown": {
          "severity": 100,
          "specialization": 100,
          "language": 100,
          "availability": 70
        }
      }
    ]
  }
}
```

### Error Codes

- `401`, `403`, `404`, `422`

---

## 7) Book Session

**Endpoint**: `/api/v1/patients/me/sessions/book`  
**Method**: `POST`

### Request Body Schema

```json
{
  "therapistId": "67c5f0af9b3d9c96f7a31c20",
  "dateTime": "2026-03-02T10:00:00.000Z"
}
```

### Validation Rules

- `therapistId`: valid UUID
- `dateTime`: valid ISO8601 and must be in the future
- Therapist must be available at requested slot
- Double booking prevented for active statuses (`pending`, `confirmed`)

### Sample Success Response

```json
{
  "success": true,
  "message": "Session booked successfully",
  "data": {
    "sessionId": "67c6...",
    "bookingReferenceId": "BK-20260227-9F3A12BC",
    "status": "pending",
    "dateTime": "2026-03-02T10:00:00.000Z",
    "therapist": {
      "id": "67c5...",
      "displayName": "Dr. Priya Rao"
    }
  }
}
```

### Error Codes

- `401`, `403`, `404`
- `409` therapist slot unavailable / patient double booking / therapist unavailable
- `422` invalid payload or past date

---

## 8) Fetch Session History

**Endpoint**: `/api/v1/patients/me/sessions`  
**Method**: `GET`

### Request Body Schema

- None (query params only)

### Validation Rules

- `status` optional: `pending | confirmed | cancelled`
- `page` optional integer `>=1`
- `limit` optional integer `1..50`

### Sample Success Response

```json
{
  "success": true,
  "message": "Session history fetched",
  "data": {
    "items": [
      {
        "sessionId": "67c6...",
        "bookingReferenceId": "BK-20260227-9F3A12BC",
        "dateTime": "2026-03-02T10:00:00.000Z",
        "status": "pending",
        "timing": "upcoming",
        "therapist": {
          "id": "67c5...",
          "name": "Dr. Priya Rao",
          "specializations": ["cbt", "anxiety"]
        },
        "bookedAt": "2026-02-27T10:25:00.000Z"
      }
    ],
    "summary": {
      "pastCount": 4,
      "upcomingCount": 2,
      "totalCount": 6
    },
    "meta": {
      "page": 1,
      "limit": 10,
      "totalItems": 6,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### Error Codes

- `401`, `403`, `404`, `422`

---

# OpenAPI (Swagger) Snippet

```yaml
openapi: 3.0.3
info:
  title: MANAS360 Patient API
  version: 1.0.0
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    ErrorResponse:
      type: object
      properties:
        message:
          type: string
        details:
          type: object
          nullable: true
paths:
  /api/v1/patients/profile:
    post:
      tags: [Patient]
      security:
        - bearerAuth: []
      summary: Create patient profile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [age, gender, emergencyContact]
              properties:
                age:
                  type: integer
                  minimum: 1
                  maximum: 120
                gender:
                  type: string
                  enum: [male, female, other, prefer_not_to_say]
                medicalHistory:
                  type: string
                  maxLength: 2000
                emergencyContact:
                  type: object
                  required: [name, relation, phone]
                  properties:
                    name:
                      type: string
                      minLength: 2
                      maxLength: 100
                    relation:
                      type: string
                      minLength: 2
                      maxLength: 50
                    phone:
                      type: string
                      pattern: '^\\+?[1-9]\\d{1,14}$'
      responses:
        '201':
          description: Patient profile created
        '401':
          description: Authentication required
        '403':
          description: Patient role required
        '422':
          description: Validation failed
  /api/v1/patients/me/assessments:
    post:
      tags: [Patient]
      security:
        - bearerAuth: []
      summary: Submit PHQ-9 or GAD-7 assessment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [type, answers]
              properties:
                type:
                  type: string
                  enum: [PHQ-9, GAD-7]
                answers:
                  type: array
                  items:
                    type: integer
                    minimum: 0
                    maximum: 3
      responses:
        '201':
          description: Assessment submitted
    get:
      tags: [Patient]
      security:
        - bearerAuth: []
      summary: Get assessment history
      parameters:
        - in: query
          name: type
          schema:
            type: string
            enum: [PHQ-9, GAD-7]
        - in: query
          name: fromDate
          schema:
            type: string
            format: date-time
        - in: query
          name: toDate
          schema:
            type: string
            format: date-time
        - in: query
          name: page
          schema:
            type: integer
            minimum: 1
        - in: query
          name: limit
          schema:
            type: integer
            minimum: 1
            maximum: 50
      responses:
        '200':
          description: Assessment history fetched
  /api/v1/patients/me/mood-history:
    get:
      tags: [Patient]
      security:
        - bearerAuth: []
      summary: Get mood history
      responses:
        '200':
          description: Mood history fetched
  /api/v1/patients/me/therapist-matches:
    get:
      tags: [Patient]
      security:
        - bearerAuth: []
      summary: Get ranked therapist matches
      parameters:
        - in: query
          name: languagePreference
          schema:
            type: string
            minLength: 2
            maxLength: 50
        - in: query
          name: specializationPreference
          schema:
            type: string
            minLength: 2
            maxLength: 80
        - in: query
          name: nextHours
          schema:
            type: integer
            minimum: 1
            maximum: 336
      responses:
        '200':
          description: Therapist matches fetched
  /api/v1/patients/me/sessions/book:
    post:
      tags: [Patient]
      security:
        - bearerAuth: []
      summary: Book a therapist session
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [therapistId, dateTime]
              properties:
                therapistId:
                  type: string
                  description: UUID
                dateTime:
                  type: string
                  format: date-time
      responses:
        '201':
          description: Session booked successfully
        '409':
          description: Slot unavailable or double booking conflict
  /api/v1/patients/me/sessions:
    get:
      tags: [Patient]
      security:
        - bearerAuth: []
      summary: Get patient session history (past + upcoming)
      parameters:
        - in: query
          name: status
          schema:
            type: string
            enum: [pending, confirmed, cancelled]
        - in: query
          name: page
          schema:
            type: integer
            minimum: 1
        - in: query
          name: limit
          schema:
            type: integer
            minimum: 1
            maximum: 50
      responses:
        '200':
          description: Session history fetched
```

---

# Example curl Commands

> Replace `${TOKEN}` with a valid patient access token.

```bash
# 1) Create patient profile
curl -X POST "http://localhost:5000/api/v1/patients/profile" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 29,
    "gender": "female",
    "medicalHistory": "Mild insomnia",
    "emergencyContact": {
      "name": "Asha",
      "relation": "sister",
      "phone": "+919999999999"
    }
  }'

# 2) Submit PHQ-9
curl -X POST "http://localhost:5000/api/v1/patients/me/assessments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PHQ-9",
    "answers": [2,2,1,1,1,1,1,0,0]
  }'

# 3) Submit GAD-7
curl -X POST "http://localhost:5000/api/v1/patients/me/assessments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "GAD-7",
    "answers": [2,1,1,1,1,0,0]
  }'

# 4) Fetch assessment history
curl "http://localhost:5000/api/v1/patients/me/assessments?page=1&limit=10&type=PHQ-9" \
  -H "Authorization: Bearer ${TOKEN}"

# 5) Fetch mood history
curl "http://localhost:5000/api/v1/patients/me/mood-history?fromDate=2026-02-01T00:00:00.000Z&toDate=2026-02-28T23:59:59.999Z" \
  -H "Authorization: Bearer ${TOKEN}"

# 6) Therapist matches
curl "http://localhost:5000/api/v1/patients/me/therapist-matches?languagePreference=english&specializationPreference=cbt&nextHours=168" \
  -H "Authorization: Bearer ${TOKEN}"

# 7) Book session
curl -X POST "http://localhost:5000/api/v1/patients/me/sessions/book" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "therapistId": "67c5f0af9b3d9c96f7a31c20",
    "dateTime": "2026-03-02T10:00:00.000Z"
  }'

# 8) Session history
curl "http://localhost:5000/api/v1/patients/me/sessions?status=pending&page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"
```
