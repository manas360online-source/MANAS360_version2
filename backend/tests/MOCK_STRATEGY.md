# Admin API Integration Tests - Mock Strategy

## Overview
This document outlines the mocking strategy for Admin API integration tests using PostgreSQLFixture, Jest, and Supertest.

---

## 1. Database Mocking Strategy

### PostgreSQLFixture
- **Purpose**: In-memory PostgreSQL instance for isolated, fast test execution
- **Setup**: Initialized in `beforeAll()` hook before any tests run
- **Teardown**: Stopped in `afterAll()` hook after all tests complete
- **Isolation**: Each test clears database using `clearTestDB()` to ensure test independence
- **Benefits**:
  - No external database dependencies
  - Fast test execution (2-5 seconds per test)
  - Parallel test safety (each test gets fresh state)
  - No cleanup of production/staging data

### Database State Management
```typescript
// Setup - Runs once before all tests
beforeAll(async () => {
  await connectToTestDB(); // Starts PostgreSQLFixture, connects Prisma
});

// Teardown - Runs once after all tests
afterAll(async () => {
  await disconnectFromTestDB(); // Closes connection, stops PostgreSQLFixture
});

// Between tests - Clear data for isolation
beforeEach(async () => {
  await clearTestDB(); // Deletes all documents from all collections
});
```

---

## 2. Data Fixtures & Entity Factories

### Factory Functions (in `tests/helpers/db-setup.ts`)
Instead of hardcoding test data, use factory functions to create consistent test entities:

```typescript
// Factory function for admin user
export const createAdminUser = async (overrides = {}) => {
  const adminData = { /* default values */ ...overrides };
  return await User.create(adminData);
};

// Factory function for patient
export const createPatientUser = async (overrides = {}) => { /* ... */ };

// Factory function for therapist + profile
export const createTherapistUser = async (overrides = {}) => { /* ... */ };
export const createTherapistProfile = async (userId, overrides = {}) => { /* ... */ };
```

### Benefits of Factory Approach
| Benefit | Example |
|---------|---------|
| **Reusability** | Use same factory across multiple tests |
| **Maintainability** | Change default data in one place |
| **Flexibility** | Override specific fields per test with `overrides` |
| **Readability** | `createAdminUser()` clearly shows intent |

### Recommended Factory Coverage
```
✓ createAdminUser()
✓ createPatientUser()
✓ createTherapistUser()
✓ createTherapistProfile()
✓ createSubscription()
✓ createSession()
✓ createPayment()
```

---

## 3. Authentication Mocking Strategy

### JWT Token Generation (in `tests/helpers/jwt.ts`)
Create test tokens without hitting real JWT signing infrastructure:

```typescript
// Generate valid admin token
const adminToken = generateAdminToken(adminUserId);

// Generate expired token
const expiredToken = generateExpiredToken(userId);

// Generate invalid token (wrong secret)
const invalidToken = generateInvalidToken(userId);
```

### Token Payload Structure
```typescript
{
  userId: 'valid-postgresql-id',
  sessionId: 'test-session-id',
  jti: 'test-jti',
  iat: 1645000000,
  exp: 1645086400
}
```

### Benefits
- **Fast**: No real signing/verification overhead
- **Controllable**: Create expired/invalid tokens easily
- **Isolated**: No dependency on auth service
- **Testable**: Can test auth failures independently

---

## 4. HTTP Request Mocking with Supertest

### Purpose
Supertest makes HTTP requests to Express app WITHOUT starting a real server:

```typescript
import request from 'supertest';
import app from '../../src/app';

const response = await request(app)
  .get('/api/v1/admin/users')
  .set('Authorization', `Bearer ${token}`)
  .query({ page: 1, limit: 10 });
```

### Benefits
- **In-Process**: No network overhead
- **Real Middleware**: Runs actual Express middleware stack
- **Full Integration**: Tests auth, RBAC, validation, errors
- **Assertions**: Built-in assertion helpers

### Request Building Pattern
```typescript
request(app)                          // Create request builder
  .get('/api/v1/admin/users')        // HTTP method + path (can be POST, PATCH, etc.)
  .set('Authorization', `Bearer ...`) // Add headers
  .query({ page: 1, limit: 10 })     // Add query parameters
  .send({ /* body data */ })         // Add request body (for POST/PATCH/PUT)
  .expect(200)                        // Assertion (optional)
  .end((err, res) => { /* ... */ })  // Callback (if not using await)
```

---

## 5. External Service Mocking (Future Considerations)

### Services NOT Mocked in Current Tests
These services are called by business logic but work fine with test DB:
- **Analytics**: Aggregates data from test collections
- **Email**: Could be mocked if required
- **Payment Gateway**: Should be mocked when payment tests added
- **File Upload**: Should be mocked when document tests added

### How to Mock External Services (When Needed)

#### Option A: Jest Manual Mocks
```typescript
jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));
```

#### Option B: Environment Variable Overrides
```typescript
// In setup.ts or test file
process.env.EMAIL_PROVIDER = 'mock';
process.env.PAYMENT_PROVIDER = 'test-mode';
```

#### Option C: Dependency Injection
```typescript
// Pass mock implementation to service constructor
const mockEmailService = { sendEmail: jest.fn() };
const authService = new AuthService(mockEmailService);
```

---

## 6. Error & Edge Case Mocking

### Testing Auth Failures
```typescript
// Missing token
await request(app).get('/api/v1/admin/users')
// → 401 Unauthorized

// Invalid token signature
const badToken = generateInvalidToken(userId);
.set('Authorization', `Bearer ${badToken}`)
// → 401 Unauthorized

// Expired token
const expiredToken = generateExpiredToken(userId);
.set('Authorization', `Bearer ${expiredToken}`)
// → 401 Unauthorized
```

### Testing Authorization Failures
```typescript
// Patient trying to access admin endpoint
const patientToken = generatePatientToken(patientId);
// → 403 Forbidden

// Deleted user trying to access
const deletedUser = await createAdminUser({ isDeleted: true });
const token = generateAdminToken(deletedUser._id);
// → 410 Gone
```

### Testing Data Validation Failures
```typescript
// Invalid UUID format
.get('/api/v1/admin/users/invalid-id')
// → 400 Bad Request

// Missing required query parameters
.query({ /* omit required params */ })
// → 400 Bad Request

// Out of range values
.query({ page: 999999, limit: -10 })
// → 400 Bad Request OR handled gracefully
```

---

## 7. Test Data Strategies

### Strategy: Minimal Setup
Use only the minimum data required for the test:
```typescript
it('✓ Admin can fetch users', async () => {
  const admin = await createAdminUser(); // Minimal admin
  // No need to create 100 users unless testing pagination
});
```

### Strategy: Business Logic Scenario
Create data that represents real business scenarios:
```typescript
it('✓ Metrics calculates correctly', async () => {
  const admin = await createAdminUser();
  const therapist = await createTherapistUser();
  const profile = await createTherapistProfile(therapist._id, { isVerified: true });
  const patient = await createPatientUser();
  const session = await createSession(patient._id, therapist._id, { status: 'completed' });
  const payment = await createPayment(patient._id, { amount: 1000 });
  // Now test metrics aggregation
});
```

### Strategy: Boundary Testing
Test edge cases and limits:
```typescript
it('✓ Respects max limit of 50 items', async () => {
  // Create 60 items
  for (let i = 0; i < 60; i++) {
    await createPatientUser({ email: `user${i}@test.com` });
  }
  // Request limit: 100 (should cap at 50)
});
```

---

## 8. Mocking Checklist

### ✅ What IS Mocked
- Database (PostgreSQLFixture - in-memory)
- JWT tokens (generated with test secret)
- User authentication state (via token)
- Test data (factories instead of hardcoded)

### ✅ What IS NOT Mocked
- Express app and middleware
- Route handlers and controllers
- Service layer logic
- RBAC middleware enforcement
- Error handler
- Input validation

### Why? 
We want REAL integration tests that verify the actual code paths work together, not unit tests of isolated components.

---

## 9. Example Test Anatomy

```typescript
describe('GET /admin/users - List Users', () => {
  it('✓ Admin can fetch users with pagination', async () => {
    // === ARRANGE ===
    // Create test data using factories
    const admin = await createAdminUser();
    const token = generateAdminToken(admin._id.toString());
    
    // Create supporting data
    await createPatientUser({ email: 'patient1@test.com' });
    await createPatientUser({ email: 'patient2@test.com' });

    // === ACT ===
    // Make HTTP request using Supertest
    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .query({ page: 1, limit: 10 });

    // === ASSERT ===
    // Verify response matches expectations
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data.users.length).toBeGreaterThan(0);
  });
});
```

---

## 10. Running the Tests

### Run all admin tests:
```bash
npm test -- tests/admin/admin.integration.test.ts
```

### Run with coverage:
```bash
npm test -- tests/admin/admin.integration.test.ts --coverage
```

### Run with watch mode:
```bash
npm test:watch -- tests/admin/admin.integration.test.ts
```

### Run specific test suite:
```bash
npm test -- tests/admin/admin.integration.test.ts -t "List Users"
```

---

## 11. Performance Considerations

| Concern | Solution |
|---------|----------|
| **Slow test startup** | PostgreSQLFixture cached on first run (~2-3s) |
| **Slow test execution** | Tests run in `--runInBand` (serial) to avoid conflicts |
| **Large dataset tests** | Clear DB between tests to prevent memory growth |
| **Token generation overhead** | JWT signing is cached, minimal overhead |

### Typical Test Execution Time
- First run: 5-7 seconds (PostgreSQLFixture download + cache)
- Subsequent runs: 2-3 seconds per full test suite
- Individual test: 50-200ms

---

## 12. Troubleshooting Guide

### Issue: PostgreSQLFixture fails to download
**Solution**: Run offline or provide manual PostgreSQL binary path
```typescript
const fixtureServer = await PostgreSQLFixture.create({
  binary: { downloadDir: '/path/to/test-db-binary' }
});
```

### Issue: Tests are flaky (sometimes pass, sometimes fail)
**Cause**: Database state not isolated between tests
**Solution**: Ensure `clearTestDB()` runs in `beforeEach()`

### Issue: Token validation fails
**Cause**: JWT_ACCESS_SECRET mismatch
**Solution**: Ensure `setup.ts` sets correct test secret

### Issue: UUID validation errors
**Cause**: Using string instead of PostgreSQL UUID
**Solution**: Ensure UUID values are generated and persisted as canonical strings

---

## Summary

| Aspect | Approach |
|--------|----------|
| **Database** | PostgreSQLFixture (in-memory, isolated) |
| **Test Data** | Factory functions with sensible defaults |
| **Auth** | JWT token helpers (no real auth service) |
| **HTTP** | Supertest (in-process requests) |
| **External Services** | Real implementation (can add mocks later) |
| **Isolation** | Clear DB between tests, fresh server instance |
| **Coverage** | Happy paths + error cases + edge cases |

This strategy enables **fast, reliable, maintainable integration tests** that verify the Admin API works correctly in isolation without external dependencies.
