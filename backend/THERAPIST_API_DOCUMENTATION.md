# Therapist API Documentation

**API Version:** 1.0.0  
**Base URL:** `https://api.manas360.com/api/v1`  
**Authentication:** JWT Bearer Token  
**Content-Type:** `application/json`

---

## Migration Status (March 2026)

Backend runtime is now Prisma-first. Some therapist endpoints are intentionally returning `501 Not Implemented` until matching Prisma models are added.

### Temporarily Unavailable (`501`)

- `POST /api/v1/therapists/profile`
- `GET /api/v1/therapists/me/profile`
- `POST /api/v1/therapists/me/documents`
- `GET /api/v1/therapists/me/leads`
- `POST /api/v1/therapists/me/leads/:id/purchase`
- `GET /api/v1/therapists/me/earnings`
- `POST /api/v1/therapists/me/sessions/:id/responses/:responseId/notes`
- `GET /api/v1/therapists/me/sessions/:id/responses/:responseId/notes`
- `GET /api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId`
- `PUT /api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId`
- `DELETE /api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId`

### Available (Prisma-backed)

- Session booking/history/detail/status endpoints under `/api/v1/therapists/me/sessions`
- Session-level encrypted note endpoint: `POST /api/v1/therapists/me/sessions/:id/notes`
- Export endpoint: `GET /api/v1/therapists/me/sessions/:id/export`

Refer to [backend/PRISMA_REENABLE_CHECKLIST.md](PRISMA_REENABLE_CHECKLIST.md) for re-enable tasks.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Profile Management](#profile-management)
3. [Document Management](#document-management)
4. [Leads](#leads)
5. [Sessions](#sessions)
6. [Session Notes](#session-notes)
7. [Earnings](#earnings)
8. [Wallet](#wallet)
9. [Error Codes](#error-codes)
10. [Rate Limiting](#rate-limiting)

---

## Authentication

All endpoints require a valid JWT Bearer token in the `Authorization` header.

### Header Format
```
Authorization: Bearer <JWT_TOKEN>
```

### JWT Token Structure
```json
{
  "id": "therapist-user-id",
  "role": "therapist",
  "email": "therapist@example.com",
  "exp": 1234567890
}
```

---

## Profile Management

### Create Therapist Profile

**Endpoint:** `POST /therapists/me/profile`

**Authentication:** Required (therapist role)

**Request Body:**
```json
{
  "name": "string (required, 2-64 chars)",
  "email": "string (required, valid email, unique)",
  "phone": "string (required, E.164 format: +<country><number>)",
  "specialization": "string (required, 2-64 chars)"
}
```

**Validation Rules:**
- `name`: required, minimum 2 characters, maximum 64 characters
- `email`: required, valid email format, must be unique across system
- `phone`: required, E.164 format (+1234567890), must be unique
- `specialization`: required, minimum 2 characters, maximum 64 characters

**Success Response (201 Created):**
```json
{
  "therapist": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Dr. Jane Doe",
    "email": "dr.jane@example.com",
    "phone": "+11234567890",
    "specialization": "Cognitive Behavioral Therapy",
    "profileStatus": "active",
    "createdAt": "2026-02-27T12:00:00.000Z",
    "updatedAt": "2026-02-27T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `409 Conflict` - Email or phone already exists

---

### Get Therapist Profile

**Endpoint:** `GET /therapists/me/profile`

**Authentication:** Required (therapist role)

**Success Response (200 OK):**
```json
{
  "therapist": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Dr. Jane Doe",
    "email": "dr.jane@example.com",
    "phone": "+11234567890",
    "specialization": "Cognitive Behavioral Therapy",
    "profileStatus": "active",
    "walletBalance": 5000.00,
    "totalEarnings": 15000.00,
    "sessionsCompleted": 25,
    "createdAt": "2026-02-27T12:00:00.000Z",
    "updatedAt": "2026-02-27T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `404 Not Found` - Profile not found

---

### Update Therapist Profile

**Endpoint:** `PUT /therapists/me/profile`

**Authentication:** Required (therapist role)

**Request Body (all fields optional):**
```json
{
  "name": "string (2-64 chars)",
  "phone": "string (E.164 format)",
  "specialization": "string (2-64 chars)",
  "bio": "string (max 500 chars)",
  "profilePhoto": "string (URL)"
}
```

**Success Response (200 OK):**
```json
{
  "therapist": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Dr. Jane Smith",
    "specialization": "Psychodynamic Therapy",
    "bio": "Specialized in anxiety and depression treatment",
    "updatedAt": "2026-02-27T13:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `409 Conflict` - Email or phone already exists

---

## Document Management

### Upload Credential Document

**Endpoint:** `POST /therapists/me/documents`

**Authentication:** Required (therapist role)

**Content-Type:** `multipart/form-data`

**Request:**
```
form-data:
  - field: "file" (binary file, required)
  - field: "documentType" (string, required)
    values: ["license", "degree", "certification", "credential"]
  - field: "expiryDate" (string, optional, ISO 8601 format)
```

**Validation Rules:**
- `file`: required, max file size 5MB, supported formats: PDF, PNG, JPG
- `documentType`: required, must be one of: license, degree, certification, credential
- `expiryDate`: optional, ISO 8601 format (2026-12-31)

**Success Response (201 Created):**
```json
{
  "document": {
    "id": "507f1f77bcf86cd799439012",
    "therapistId": "507f1f77bcf86cd799439011",
    "type": "license",
    "fileUrl": "https://s3.amazonaws.com/bucket/therapist-docs/file-hash.pdf",
    "fileName": "medical-license.pdf",
    "fileSize": 2048576,
    "uploadedAt": "2026-02-27T12:00:00.000Z",
    "expiryDate": "2027-12-31",
    "verificationStatus": "pending"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing file or invalid document type
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `413 Payload Too Large` - File exceeds 5MB limit

---

### List Therapist Documents

**Endpoint:** `GET /therapists/me/documents`

**Authentication:** Required (therapist role)

**Query Parameters:**
```
- page: number (default: 1)
- limit: number (default: 10, max: 50)
- type: string (optional, filter by document type)
- verificationStatus: string (optional, pending|verified|rejected)
```

**Success Response (200 OK):**
```json
{
  "documents": [
    {
      "id": "507f1f77bcf86cd799439012",
      "type": "license",
      "fileName": "medical-license.pdf",
      "verificationStatus": "verified",
      "uploadedAt": "2026-02-27T12:00:00.000Z",
      "expiryDate": "2027-12-31"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "pages": 1
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role

---

### Get Document Signed URL

**Endpoint:** `GET /therapists/me/documents/{documentId}/signed-url`

**Authentication:** Required (therapist role)

**Success Response (200 OK):**
```json
{
  "signedUrl": "https://s3.amazonaws.com/bucket/therapist-docs/file.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "expiresIn": 3600
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Not document owner
- `404 Not Found` - Document not found

---

### Delete Document

**Endpoint:** `DELETE /therapists/me/documents/{documentId}`

**Authentication:** Required (therapist role)

**Success Response (200 OK):**
```json
{
  "message": "Document deleted successfully",
  "documentId": "507f1f77bcf86cd799439012"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Not document owner
- `404 Not Found` - Document not found

---

## Leads

### List Available Leads

**Endpoint:** `GET /therapists/me/leads`

**Authentication:** Required (therapist role)

**Query Parameters:**
```
- page: number (default: 1)
- limit: number (default: 10, max: 50)
- specialization: string (optional, filter by issue type)
- minBudget: number (optional, filter by minimum budget)
- maxBudget: number (optional, filter by maximum budget)
- sortBy: string (optional, fields: budget, createdAt, duration)
- sortOrder: string (optional, asc|desc, default: desc)
- status: string (optional, available|purchased|expired)
```

**Success Response (200 OK):**
```json
{
  "leads": [
    {
      "id": "607f1f77bcf86cd799439020",
      "patientName": "Anonymous Patient",
      "issue": "Anxiety Disorder",
      "expectedDuration": "6 weeks",
      "budget": 150.00,
      "status": "available",
      "createdAt": "2026-02-27T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `400 Bad Request` - Invalid query parameters

---

### Get Lead Details

**Endpoint:** `GET /therapists/me/leads/{leadId}`

**Authentication:** Required (therapist role)

**Success Response (200 OK):**
```json
{
  "lead": {
    "id": "607f1f77bcf86cd799439020",
    "patientName": "Anonymous Patient",
    "issue": "Anxiety Disorder",
    "description": "Patient experiencing persistent anxiety and panic attacks",
    "expectedDuration": "6 weeks",
    "preferredSessionFrequency": "2x per week",
    "budget": 150.00,
    "currency": "USD",
    "status": "available",
    "createdAt": "2026-02-27T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `404 Not Found` - Lead not found

---

### Purchase Lead

**Endpoint:** `POST /therapists/me/leads/{leadId}/purchase`

**Authentication:** Required (therapist role)

**Request Body:**
```json
{}
```

**Success Response (201 Created):**
```json
{
  "transaction": {
    "id": "707f1f77bcf86cd799439030",
    "therapistId": "507f1f77bcf86cd799439011",
    "leadId": "607f1f77bcf86cd799439020",
    "amount": 150.00,
    "currency": "USD",
    "type": "debit",
    "status": "completed",
    "sessionCreated": true,
    "createdAt": "2026-02-27T12:30:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `402 Payment Required` - Insufficient wallet balance
- `403 Forbidden` - Non-therapist role
- `404 Not Found` - Lead not found
- `409 Conflict` - Lead already purchased

---

## Sessions

### List Therapist Sessions

**Endpoint:** `GET /therapists/me/sessions`

**Authentication:** Required (therapist role)

**Query Parameters:**
```
- page: number (default: 1)
- limit: number (default: 10, max: 50)
- status: string (optional, scheduled|in-progress|completed|cancelled)
- startDate: string (optional, ISO 8601 format)
- endDate: string (optional, ISO 8601 format)
- sortBy: string (optional, scheduledAt|createdAt)
- sortOrder: string (optional, asc|desc)
```

**Success Response (200 OK):**
```json
{
  "sessions": [
    {
      "id": "807f1f77bcf86cd799439040",
      "patientId": "907f1f77bcf86cd799439050",
      "patientName": "John Doe",
      "therapistId": "507f1f77bcf86cd799439011",
      "status": "scheduled",
      "scheduledAt": "2026-03-01T14:00:00.000Z",
      "duration": 60,
      "sessionType": "video",
      "notesAdded": false,
      "createdAt": "2026-02-27T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 24,
    "pages": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `400 Bad Request` - Invalid query parameters

---

### Get Session Details

**Endpoint:** `GET /therapists/me/sessions/{sessionId}`

**Authentication:** Required (therapist role)

**Success Response (200 OK):**
```json
{
  "session": {
    "id": "807f1f77bcf86cd799439040",
    "patientId": "907f1f77bcf86cd799439050",
    "patientName": "John Doe",
    "patientEmail": "john@example.com",
    "therapistId": "507f1f77bcf86cd799439011",
    "status": "scheduled",
    "scheduledAt": "2026-03-01T14:00:00.000Z",
    "startedAt": null,
    "completedAt": null,
    "duration": 60,
    "sessionType": "video",
    "meetingLink": "https://video.platform.com/room/session-id",
    "notes": {
      "count": 3,
      "lastNoteAt": "2026-03-01T15:00:00.000Z"
    },
    "createdAt": "2026-02-27T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role or not session owner
- `404 Not Found` - Session not found

---

### Update Session Status

**Endpoint:** `PATCH /therapists/me/sessions/{sessionId}`

**Authentication:** Required (therapist role)

**Request Body:**
```json
{
  "status": "string (required, completed|cancelled)",
  "cancellationReason": "string (required if status=cancelled, max 255 chars)",
  "completionNotes": "string (optional, max 500 chars)"
}
```

**Validation Rules:**
- `status`: required, must be "completed" or "cancelled"
- `cancellationReason`: required if status is "cancelled"
- `completionNotes`: optional, max 500 characters

**Success Response (200 OK):**
```json
{
  "session": {
    "id": "807f1f77bcf86cd799439040",
    "status": "completed",
    "completedAt": "2026-03-01T15:00:00.000Z",
    "updatedAt": "2026-03-01T15:05:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed or invalid status transition
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role or not session owner
- `404 Not Found` - Session not found
- `409 Conflict` - Cannot change status of completed/cancelled session

---

## Session Notes

### Add Encrypted Session Note

**Endpoint:** `POST /therapists/me/sessions/{sessionId}/notes`

**Authentication:** Required (therapist role)

**Request Body:**
```json
{
  "content": "string (required, min 10 chars, max 10000 chars)"
}
```

**Validation Rules:**
- `content`: required, minimum 10 characters, maximum 10,000 characters
- Only session owner (therapist) can add notes
- Content is encrypted with AES-256-GCM before storage

**Success Response (201 Created):**
```json
{
  "note": {
    "id": "907f1f77bcf86cd799439060",
    "sessionId": "807f1f77bcf86cd799439040",
    "therapistId": "507f1f77bcf86cd799439011",
    "createdAt": "2026-03-01T15:05:00.000Z",
    "updatedAt": "2026-03-01T15:05:00.000Z"
  }
}
```

**Note:** Plaintext content is never stored or returned. Content is encrypted server-side.

**Error Responses:**
- `400 Bad Request` - Content validation failed
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role or not session owner
- `404 Not Found` - Session not found

---

### List Session Notes

**Endpoint:** `GET /therapists/me/sessions/{sessionId}/notes`

**Authentication:** Required (therapist role)

**Query Parameters:**
```
- page: number (default: 1)
- limit: number (default: 10, max: 50)
- sortBy: string (optional, createdAt|updatedAt)
- sortOrder: string (optional, asc|desc)
```

**Success Response (200 OK):**
```json
{
  "notes": [
    {
      "id": "907f1f77bcf86cd799439060",
      "sessionId": "807f1f77bcf86cd799439040",
      "createdAt": "2026-03-01T15:05:00.000Z",
      "updatedAt": "2026-03-01T15:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "pages": 1
  }
}
```

**Note:** Plaintext content is NOT returned in list response for security.

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role or not session owner
- `404 Not Found` - Session not found

---

### Get Decrypted Session Note

**Endpoint:** `GET /therapists/me/sessions/{sessionId}/notes/{noteId}`

**Authentication:** Required (therapist role)

**Success Response (200 OK):**
```json
{
  "note": {
    "id": "907f1f77bcf86cd799439060",
    "sessionId": "807f1f77bcf86cd799439040",
    "content": "Patient discussed anxiety triggers and coping mechanisms. Recommended CBT exercises for next session.",
    "createdAt": "2026-03-01T15:05:00.000Z",
    "updatedAt": "2026-03-01T15:05:00.000Z"
  }
}
```

**Note:** Content is decrypted server-side for the authorized therapist only.

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role or not note owner
- `404 Not Found` - Note or session not found

---

### Update Session Note

**Endpoint:** `PUT /therapists/me/sessions/{sessionId}/notes/{noteId}`

**Authentication:** Required (therapist role)

**Request Body:**
```json
{
  "content": "string (required, min 10 chars, max 10000 chars)"
}
```

**Success Response (200 OK):**
```json
{
  "note": {
    "id": "907f1f77bcf86cd799439060",
    "content": "Updated note content with new observations.",
    "updatedAt": "2026-03-01T16:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Content validation failed
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role or not note owner
- `404 Not Found` - Note not found

---

### Delete Session Note

**Endpoint:** `DELETE /therapists/me/sessions/{sessionId}/notes/{noteId}`

**Authentication:** Required (therapist role)

**Success Response (204 No Content):**
```
(No response body)
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role or not note owner
- `404 Not Found` - Note not found

---

## Earnings

### Get Earnings Overview

**Endpoint:** `GET /therapists/me/earnings`

**Authentication:** Required (therapist role)

**Query Parameters:**
```
- startDate: string (optional, ISO 8601 format)
- endDate: string (optional, ISO 8601 format)
- year: number (optional, filter by year)
- month: number (optional, 1-12, requires year parameter)
```

**Success Response (200 OK):**
```json
{
  "earnings": {
    "totalEarnings": 15000.00,
    "pendingAmount": 2000.00,
    "withdrawnAmount": 13000.00,
    "completedSessions": 25,
    "averageSessionValue": 600.00,
    "monthlyBreakdown": [
      {
        "month": "2026-02",
        "earnings": 3000.00,
        "sessionsCompleted": 5
      },
      {
        "month": "2026-01",
        "earnings": 4500.00,
        "sessionsCompleted": 7
      }
    ],
    "lastUpdate": "2026-02-27T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `400 Bad Request` - Invalid date parameters

---

### Get Earnings History

**Endpoint:** `GET /therapists/me/earnings/history`

**Authentication:** Required (therapist role)

**Query Parameters:**
```
- page: number (default: 1)
- limit: number (default: 10, max: 50)
- startDate: string (optional, ISO 8601 format)
- endDate: string (optional, ISO 8601 format)
- sortBy: string (optional, amount|completedAt, default: completedAt)
- sortOrder: string (optional, asc|desc, default: desc)
```

**Success Response (200 OK):**
```json
{
  "history": [
    {
      "id": "907f1f77bcf86cd799439070",
      "sessionId": "807f1f77bcf86cd799439040",
      "patientName": "John Doe",
      "amount": 150.00,
      "currency": "USD",
      "completedAt": "2026-03-01T15:00:00.000Z",
      "status": "completed"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `400 Bad Request` - Invalid query parameters

---

### Get Monthly Earnings Breakdown

**Endpoint:** `GET /therapists/me/earnings/monthly`

**Authentication:** Required (therapist role)

**Query Parameters:**
```
- year: number (required, YYYY format)
```

**Success Response (200 OK):**
```json
{
  "year": 2026,
  "monthlyBreakdown": [
    {
      "month": 2,
      "monthName": "February",
      "earnings": 3500.00,
      "sessionsCompleted": 6,
      "averageSessionValue": 583.33
    },
    {
      "month": 1,
      "monthName": "January",
      "earnings": 4500.00,
      "sessionsCompleted": 7,
      "averageSessionValue": 642.86
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `400 Bad Request` - Missing or invalid year parameter

---

### Get Earnings by Type

**Endpoint:** `GET /therapists/me/earnings/by-type`

**Authentication:** Required (therapist role)

**Success Response (200 OK):**
```json
{
  "byType": [
    {
      "sessionType": "video",
      "earnings": 10000.00,
      "sessionsCompleted": 20,
      "percentage": 66.67
    },
    {
      "sessionType": "audio",
      "earnings": 5000.00,
      "sessionsCompleted": 5,
      "percentage": 33.33
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role

---

## Wallet

### Get Wallet Details

**Endpoint:** `GET /therapists/me/wallet`

**Authentication:** Required (therapist role)

**Success Response (200 OK):**
```json
{
  "wallet": {
    "id": "1007f1f77bcf86cd799439080",
    "therapistId": "507f1f77bcf86cd799439011",
    "balance": 5000.00,
    "currency": "USD",
    "totalEarnings": 15000.00,
    "totalWithdrawn": 10000.00,
    "lastWithdrawal": "2026-02-20T10:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-02-27T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `404 Not Found` - Wallet not found

---

### Get Wallet Transactions

**Endpoint:** `GET /therapist/me/wallet/transactions`

**Authentication:** Required (therapist role)

**Query Parameters:**
```
- page: number (default: 1)
- limit: number (default: 10, max: 50)
- type: string (optional, debit|credit)
- status: string (optional, completed|pending|failed)
- startDate: string (optional, ISO 8601 format)
- endDate: string (optional, ISO 8601 format)
```

**Success Response (200 OK):**
```json
{
  "transactions": [
    {
      "id": "1107f1f77bcf86cd799439090",
      "therapistId": "507f1f77bcf86cd799439011",
      "amount": 150.00,
      "type": "debit",
      "status": "completed",
      "description": "Lead purchase - John Doe",
      "reference": "lead-607f1f77bcf86cd799439020",
      "createdAt": "2026-02-27T12:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Non-therapist role
- `400 Bad Request` - Invalid query parameters

---

## Error Codes

### HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request succeeded, no content to return |
| 400 | Bad Request | Invalid request parameters or validation failed |
| 401 | Unauthorized | Missing or invalid authentication token |
| 402 | Payment Required | Insufficient wallet balance |
| 403 | Forbidden | User lacks required permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists or state conflict |
| 413 | Payload Too Large | File exceeds size limit |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Server temporarily unavailable |

### Error Response Format

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {
    "field": "Description of field-specific error"
  },
  "timestamp": "2026-02-27T12:00:00.000Z"
}
```

### Validation Error Response

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "phone",
      "message": "Phone must be in E.164 format"
    }
  ],
  "timestamp": "2026-02-27T12:00:00.000Z"
}
```

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse.

**Rate Limits:**
- **Authenticated Users:** 1,000 requests per hour
- **File Uploads:** 10 uploads per hour
- **Leads Purchase:** 50 purchases per hour
- **Login Attempts:** 5 attempts per 15 minutes

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 990
X-RateLimit-Reset: 1645875600
```

**Rate Limit Exceeded Response (429):**
```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3600
}
```

---

## Common Request Examples

### Example 1: Create Therapist Profile
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Jane Doe",
    "email": "dr.jane@example.com",
    "phone": "+11234567890",
    "specialization": "Cognitive Behavioral Therapy"
  }'
```

### Example 2: Upload Document with File
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "documentType=license" \
  -F "file=@/path/to/license.pdf"
```

### Example 3: Purchase Lead
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/leads/607f1f77bcf86cd799439020/purchase \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Example 4: List Sessions with Filter
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/sessions?status=completed&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 5: Add Encrypted Session Note
```bash
curl -X POST https://api.manas360.com/api/v1/therapists/me/sessions/807f1f77bcf86cd799439040/notes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Patient discussed anxiety triggers and recommended CBT exercises for next session."
  }'
```

### Example 6: Get Earnings Overview
```bash
curl -X GET "https://api.manas360.com/api/v1/therapists/me/earnings?year=2026&month=2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## API Versioning

The current API version is **v1**. Future versions will be available at `/api/v2`, `/api/v3`, etc.

---

## Support

For API support and issues, contact: `api-support@manas360.com`
