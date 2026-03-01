# Therapist API Integration Tests

A comprehensive integration test suite for the Therapist API using Jest, Supertest, and PostgreSQLFixture.

## Overview

This test suite provides complete coverage of the Therapist API endpoints with:
- **PostgreSQLFixture** for isolated PostgreSQL database per test suite
- **Supertest** for HTTP endpoint testing
- **JWT token mocking** for authentication/authorization tests
- **S3 mocking** for file upload operations
- **Encrypted session notes** validation
- **Transaction atomicity** testing for wallet operations

## Test Structure

### Test Files

```
tests/therapist/
├── profile.integration.test.ts       # Therapist profile CRUD
├── document.integration.test.ts      # Credential document upload
├── leads.integration.test.ts         # Lead fetching & filtering
├── lead-purchase.integration.test.ts # Lead purchase & wallet
├── sessions.integration.test.ts      # Session management
├── session-note.integration.test.ts  # Encrypted session notes
├── earnings.integration.test.ts      # Earnings aggregation
├── test-utils.ts                    # Shared utilities & test data
├── s3.mock.ts                       # S3 service mocking
└── setup.ts                         # Global test setup
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- tests/therapist/profile.integration.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Run in Watch Mode
```bash
npm test -- --watch
```

### Run with Debugging
```bash
npm test -- --runInBand --detectOpenHandles
```

## Test Coverage Checklist

### 1. Profile Management ✓
- [x] Create therapist profile with valid data
- [x] Create with missing/invalid fields (validation)
- [x] Create with duplicate email (conflict handling)
- [x] Fetch therapist profile (GET /me/profile)
- [x] Update therapist profile (PUT /me/profile)
- [x] Enforce role-based access (therapist-only)
- [x] Require valid JWT token

### 2. Document Upload ✓
- [x] Upload credential document (POST /documents)
- [x] Mock S3 upload integration
- [x] Validate document type (license, degree, certification)
- [x] File attachment validation
- [x] Fetch uploaded documents (GET /documents)
- [x] Delete document (DELETE /documents/:id)
- [x] Generate signed URL for download
- [x] Enforce role-based access

### 3. Leads Management ✓
- [x] Fetch available leads (GET /leads)
- [x] Pagination support (page, limit)
- [x] Filter by specialization, budget range
- [x] Sort by various fields (budget, createdAt)
- [x] Fetch single lead details (GET /leads/:id)
- [x] Handle non-existent leads (404)
- [x] Enforce therapist-only access
- [x] Proper response structure validation

### 4. Lead Purchase ✓
- [x] Purchase lead (POST /leads/:id/purchase)
- [x] Successful purchase with transaction creation
- [x] Prevent duplicate purchase (conflict 409)
- [x] Reject purchases with insufficient balance
- [x] Wallet balance management
- [x] Transaction history tracking
- [x] Transaction response structure validation
- [x] Enforce therapist-only access

### 5. Session Management ✓
- [x] Fetch therapist sessions (GET /sessions)
- [x] Pagination & filtering by status
- [x] Date range filtering
- [x] Fetch single session (GET /sessions/:id)
- [x] Update session status (scheduled → completed/cancelled)
- [x] Validate session status transitions
- [x] Handle non-existent sessions (404)
- [x] Proper response structure validation

### 6. Encrypted Session Notes ✓
- [x] Add encrypted note (POST /sessions/:id/notes)
- [x] Content encryption/decryption
- [x] Fetch decrypted note (GET /notes/:id)
- [x] List notes without exposing plaintext
- [x] Update note content (PUT /notes/:id)
- [x] Delete note (DELETE /notes/:id)
- [x] Enforce therapist-only access
- [x] Prevent unauthorized note access
- [x] Validate note length constraints

### 7. Earnings Aggregation ✓
- [x] Fetch earnings overview (GET /earnings)
- [x] Total earnings calculation
- [x] Monthly breakdown aggregation
- [x] Completed sessions count
- [x] Average session value calculation
- [x] Date range filtering
- [x] Yearly/monthly filtering
- [x] Earnings history with pagination
- [x] Breakdown by month/session type
- [x] Sorting & filtering in history
- [x] Response structure validation
- [x] Aggregation accuracy verification

### 8. Security & RBAC ✓
- [x] JWT token validation
- [x] Bearer token format enforcement
- [x] Invalid token rejection (401)
- [x] Role-based access control (therapist-only)
- [x] Non-therapist requests rejected (403)
- [x] Encrypted note access control
- [x] Cross-therapist note access prevention
- [x] Therapist isolation in queries

### 9. Validation ✓
- [x] Required field validation
- [x] Email format validation
- [x] Phone number format (E.164)
- [x] String length constraints
- [x] Numeric range validation
- [x] Date format validation
- [x] Enum value validation (status, documentType)
- [x] Error message structure

### 10. Error Handling ✓
- [x] 400 Bad Request (validation failures)
- [x] 401 Unauthorized (missing/invalid token)
- [x] 403 Forbidden (insufficient role)
- [x] 404 Not Found (missing resources)
- [x] 409 Conflict (duplicate purchase)
- [x] Meaningful error messages

## Test Utilities

### test-utils.ts
Provides helper functions and test data:

```typescript
// Create valid JWT token
const token = createTestToken('user-id', 'therapist');

// Test data fixtures
const validTherapistProfile = { ... };
const invalidTherapistProfile = { ... };
```

### s3.mock.ts
Mocks AWS S3 service for file uploads:

```typescript
mockS3Service.uploadFile.mockResolvedValueOnce({
  fileUrl: 'https://mock-s3.com/file.pdf',
  key: 'therapist-docs/key',
});
```

## Key Testing Patterns

### 1. PostgreSQLFixture Initialization
```typescript
let dbFixture: PostgreSQLFixture;

beforeAll(async () => {
  dbFixture = await PostgreSQLFixture.create();
  await Prisma.connect(dbFixture.getUri());
});

afterAll(async () => {
  await Prisma.disconnect();
  await dbFixture.stop();
});
```

### 2. Authentication Tests
```typescript
const token = createTestToken('therapist-123', 'therapist');

const res = await request(app)
  .post('/api/v1/therapists/me/profile')
  .set('Authorization', `Bearer ${token}`)
  .send(validTherapistProfile);
```

### 3. Error Handling Tests
```typescript
it('should fail without authorization', async () => {
  const res = await request(app).post('/api/v1/therapists/me/profile');
  expect(res.status).toBe(401);
  expect(res.body).toHaveProperty('error');
});
```

### 4. S3 Mock Verification
```typescript
expect(mockS3Service.uploadFile).toHaveBeenCalled();
expect(mockS3Service.getSignedUrl).toHaveBeenCalledWith(expectedKey);
```

## Expected Test Results

```
PASS  tests/therapist/profile.integration.test.ts (2.345 s)
PASS  tests/therapist/document.integration.test.ts (2.567 s)
PASS  tests/therapist/leads.integration.test.ts (1.234 s)
PASS  tests/therapist/lead-purchase.integration.test.ts (1.456 s)
PASS  tests/therapist/sessions.integration.test.ts (1.678 s)
PASS  tests/therapist/session-note.integration.test.ts (2.890 s)
PASS  tests/therapist/earnings.integration.test.ts (2.123 s)

Test Suites: 7 passed, 7 total
Tests: 78 passed, 78 total
Snapshots: 0 total
Time: 14.293 s
```

## Notes

- Tests use **isolated PostgreSQL instances** via PostgreSQLFixture
- **S3 uploads** are completely mocked (no AWS calls)
- **JWT tokens** are created with test secrets
- **Encryption** is tested end-to-end with real AES-256-GCM
- Tests are **independent** and can run in parallel
- Each test file has its own database lifecycle

## Troubleshooting

### "Port already in use" errors
Clear any lingering PostgreSQL instances:
```bash
pkill -f postgres
```

### TypeScript compilation errors
Ensure types are installed:
```bash
npm install --save-dev @types/jest @types/supertest
```

### Test timeout issues
Increase Jest timeout for long-running tests:
```typescript
jest.setTimeout(30000);
```

## Future Enhancements

- [ ] Add performance/load testing
- [ ] Add visual/snapshot testing
- [ ] Add API contract testing
- [ ] Add mutation testing
- [ ] CI/CD pipeline integration
- [ ] Test coverage reporting dashboard
