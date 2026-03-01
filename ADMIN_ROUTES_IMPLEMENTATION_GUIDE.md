# Admin Routes Implementation Guide

## Current Admin Routes (Updated with New RBAC Middleware)

All 5 admin routes are now using the new `requireRole('admin')` syntax:

```typescript
// backend/src/routes/admin.routes.ts

import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';  // ✅ New import

const router = Router();

// List all users
router.get('/users',
  requireAuth,
  requireRole('admin'),  // ✅ Admin-only
  ...validateAdminListUsersQuery,
  asyncHandler(listUsersController)
);

// Get single user
router.get('/users/:id',
  requireAuth,
  requireRole('admin'),  // ✅ Admin-only
  ...validateAdminGetUserIdParam,
  asyncHandler(getUserController)
);

// Verify therapist
router.patch('/therapists/:id/verify',
  requireAuth,
  requireRole('admin'),  // ✅ Admin-only
  ...validateTherapistProfileIdParam,
  asyncHandler(verifyTherapistController)
);

// Get metrics
router.get('/metrics',
  requireAuth,
  requireRole('admin'),  // ✅ Admin-only
  asyncHandler(getMetricsController)
);

// List subscriptions
router.get('/subscriptions',
  requireAuth,
  requireRole('admin'),  // ✅ Admin-only
  ...validateAdminListSubscriptionsQuery,
  asyncHandler(listSubscriptionsController)
);
```

---

## Test Scenarios

### Scenario 1: Authorized Admin Access ✅

**Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "email": "patient1@example.com",
      "role": "patient",
      "isVerified": true,
      "createdAt": "2026-02-01T10:00:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "email": "therapist1@example.com",
      "role": "therapist",
      "isVerified": true,
      "createdAt": "2026-02-05T10:00:00Z"
    }
  ],
  "_meta": {
    "page": 1,
    "limit": 10,
    "total": 142,
    "totalPages": 15
  }
}
```

---

### Scenario 2: Missing JWT Token ❌

**Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=10" \
  -H "Content-Type: application/json"
# No Authorization header
```

**Response (401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Authentication required",
  "statusCode": 401,
  "timestamp": "2026-02-27T10:30:00Z"
}
```

**Verification**:
- ✅ requireAuth middleware rejected request
- ✅ No role check was performed
- ✅ Clear error message

---

### Scenario 3: Invalid JWT Token ❌

**Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer invalid.token.structure" \
  -H "Content-Type: application/json"
```

**Response (401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "statusCode": 401,
  "timestamp": "2026-02-27T10:30:00Z"
}
```

**Verification**:
- ✅ JWT verification failed
- ✅ Clear error message
- ✅ No bypass possible

---

### Scenario 4: Patient Role Attempting Access ❌

**Request**:
```bash
# Assume patient_token is a valid JWT with role='patient'
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwicm9sZSI6InBhdGllbnQifQ..." \
  -H "Content-Type: application/json"
```

**Response (403 Forbidden)**:
```json
{
  "success": false,
  "message": "Access denied. Required role(s): admin. Your role: patient",
  "statusCode": 403,
  "timestamp": "2026-02-27T10:30:00Z"
}
```

**Verification**:
- ✅ Authentication passed (valid JWT)
- ✅ Authorization failed (wrong role)
- ✅ Clear message showing required vs actual role
- ✅ RBAC middleware validated in database

---

### Scenario 5: Therapist Role Attempting Access ❌

**Request**:
```bash
curl -X PATCH "http://localhost:3000/api/v1/admin/therapists/507f1f77bcf86cd799439011/verify" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0aGVyYXBpc3QxMjMiLCJyb2xlIjoidGhlcmFwaXN0In0..." \
  -H "Content-Type: application/json"
```

**Response (403 Forbidden)**:
```json
{
  "success": false,
  "message": "Access denied. Required role(s): admin. Your role: therapist",
  "statusCode": 403,
  "timestamp": "2026-02-27T10:30:00Z"
}
```

**Verification**:
- ✅ Therapist cannot access admin endpoints
- ✅ Cannot verify their own credentials
- ✅ Privilege escalation prevented

---

### Scenario 6: Deleted Admin Account ❌

**Request**:
```bash
# Admin account still has valid JWT but account is deleted
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbjEyMyIsInJvbGUiOiJhZG1pbiJ9..." \
  -H "Content-Type: application/json"
```

**Response (410 Gone)**:
```json
{
  "success": false,
  "message": "User account is deleted. Please contact support.",
  "statusCode": 410,
  "timestamp": "2026-02-27T10:30:00Z"
}
```

**Verification**:
- ✅ RBAC middleware checks isDeleted flag
- ✅ Deleted account returns 410 (not 403)
- ✅ Token is still valid but account is blocked
- ✅ Clear distinction from unauthorized vs deleted

---

### Scenario 7: Invalid Route Parameter (Bad UUID) ❌

**Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users/invalid-id-123" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response (400 Bad Request)**:
```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "validationError": "Id must be a valid PostgreSQL UUID",
  "timestamp": "2026-02-27T10:30:00Z"
}
```

**Verification**:
- ✅ Authentication passed
- ✅ Authorization passed
- ✅ Parameter validation failed
- ✅ Clear validation error

---

### Scenario 8: Invalid Query Parameters ❌

**Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users?page=abc&limit=100&role=invalid" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response (400 Bad Request)**:
```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "validationErrors": [
    "page must be a positive number",
    "limit must be <= 50",
    "role must be one of: patient, therapist, admin"
  ],
  "timestamp": "2026-02-27T10:30:00Z"
}
```

**Verification**:
- ✅ Multiple validation errors caught
- ✅ Clear messages per field
- ✅ Limits enforced (max 50 items)
- ✅ Enum values validated

---

### Scenario 9: GET /metrics Endpoint ✅

**Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/admin/metrics" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalUsers": 1543,
    "totalTherapists": 287,
    "verifiedTherapists": 245,
    "completedSessions": 8934,
    "totalRevenue": 125000.50,
    "activeSubscriptions": 892
  },
  "_meta": {
    "timestamp": "2026-02-27T10:30:00Z",
    "requestedBy": "admin"
  }
}
```

---

### Scenario 10: PATCH /therapists/:id/verify Endpoint ✅

**Request**:
```bash
curl -X PATCH "http://localhost:3000/api/v1/admin/therapists/507f1f77bcf86cd799439011/verify" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Therapist verified successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439001",
    "isVerified": true,
    "verificationStatus": "verified",
    "verifiedAt": "2026-02-27T10:30:00Z",
    "verifiedBy": "507f1f77bcf86cd799439999"
  }
}
```

---

## cURL Command Examples

### Get Logged-In User
```bash
# Get admin token (requires login via /auth/login)
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword123"
  }' | jq -r '.data.token')

echo "Admin token: $ADMIN_TOKEN"
```

### List All Users
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq .
```

### Get Single User
```bash
USER_ID="507f1f77bcf86cd799439011"

curl -X GET "http://localhost:3000/api/v1/admin/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq .
```

### List Therapists with Filters
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users?role=therapist&status=active&page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq .
```

### Verify Therapist
```bash
THERAPIST_ID="507f1f77bcf86cd799439011"

curl -X PATCH "http://localhost:3000/api/v1/admin/therapists/$THERAPIST_ID/verify" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq .
```

### Get Platform Metrics
```bash
curl -X GET "http://localhost:3000/api/v1/admin/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq .
```

### List Subscriptions with Filters
```bash
curl -X GET "http://localhost:3000/api/v1/admin/subscriptions?planType=premium&status=active&page=1&limit=25" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq .
```

### Test Unauthorized Access (With Patient Token)
```bash
# Get patient token
PATIENT_TOKEN=$(curl -s -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123"
  }' | jq -r '.data.token')

# Try to access admin endpoint (should fail)
curl -X GET "http://localhost:3000/api/v1/admin/users" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" | jq .
# Expected: 403 Forbidden with message about insufficient role
```

---

## JavaScript/TypeScript Examples

### Using Axios
```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';
let adminToken = '';

// Login as admin
async function loginAdmin() {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@example.com',
    password: 'securepassword123'
  });
  adminToken = response.data.data.token;
}

// Get all users
async function getUsers(page = 1, limit = 10) {
  try {
    const response = await axios.get(`${API_BASE}/admin/users`, {
      params: { page, limit },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Users:', response.data.data);
  } catch (error) {
    if (error.response?.status === 403) {
      console.error('Not authorized to access admin endpoints');
    } else if (error.response?.status === 401) {
      console.error('Authentication required');
    }
  }
}

// Get single user
async function getUser(userId: string) {
  try {
    const response = await axios.get(`${API_BASE}/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('User:', response.data.data);
  } catch (error) {
    console.error('Error:', error.response?.data?.message);
  }
}

// Verify therapist
async function verifyTherapist(therapistId: string) {
  try {
    const response = await axios.patch(
      `${API_BASE}/admin/therapists/${therapistId}/verify`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('Therapist verified:', response.data.data);
  } catch (error) {
    console.error('Error:', error.response?.data?.message);
  }
}

// Get metrics
async function getMetrics() {
  try {
    const response = await axios.get(`${API_BASE}/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Metrics:', response.data.data);
  } catch (error) {
    console.error('Error:', error.response?.data?.message);
  }
}

// List subscriptions
async function getSubscriptions(planType?: string, status?: string) {
  try {
    const response = await axios.get(`${API_BASE}/admin/subscriptions`, {
      params: { planType, status, page: 1, limit: 10 },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Subscriptions:', response.data.data);
  } catch (error) {
    console.error('Error:', error.response?.data?.message);
  }
}

// Run example
(async () => {
  await loginAdmin();
  await getUsers();
  await getMetrics();
})();
```

### Using Fetch API
```typescript
const API_BASE = 'http://localhost:3000/api/v1';
let adminToken = '';

async function loginAdmin() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'securepassword123'
    })
  });
  const data = await response.json();
  adminToken = data.data.token;
}

async function getUsers(page = 1, limit = 10) {
  try {
    const response = await fetch(
      `${API_BASE}/admin/users?page=${page}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    if (response.status === 403) {
      console.error('Forbidden: Not authorized');
      return;
    }
    
    if (response.status === 401) {
      console.error('Unauthorized: Invalid or missing token');
      return;
    }
    
    const data = await response.json();
    console.log('Users:', data.data);
  } catch (error) {
    console.error('Error:', error);
  }
}

await loginAdmin();
await getUsers();
```

---

## Security Test Suite

### Test 1: Verify All Routes Require Auth
```bash
#!/bin/bash

echo "Testing unauthenticated access to all admin routes..."

endpoints=(
  "/api/v1/admin/users"
  "/api/v1/admin/metrics"
  "/api/v1/admin/subscriptions"
)

for endpoint in "${endpoints[@]}"; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${endpoint}")
  if [ "$response" = "401" ]; then
    echo "✅ $endpoint - Requires authentication"
  else
    echo "❌ $endpoint - Should return 401, got $response"
  fi
done
```

### Test 2: Verify Role Enforcement
```bash
#!/bin/bash

# Get patient token
PATIENT_TOKEN=$(curl -s -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","password":"password123"}' \
  | jq -r '.data.token')

echo "Testing admin routes with patient token..."

endpoints=(
  "/api/v1/admin/users"
  "/api/v1/admin/users/507f1f77bcf86cd799439011"
  "/api/v1/admin/metrics"
  "/api/v1/admin/subscriptions"
)

for endpoint in "${endpoints[@]}"; do
  response=$(curl -s \
    -H "Authorization: Bearer $PATIENT_TOKEN" \
    "http://localhost:3000${endpoint}" | jq -r '.statusCode')
  if [ "$response" = "403" ]; then
    echo "✅ $endpoint - Correctly returns 403 for patient"
  else
    echo "❌ $endpoint - Should return 403, got $response"
  fi
done
```

---

## Summary

✅ **All 5 admin routes protected**
✅ **All routes use requireAuth middleware**
✅ **All routes use requireRole('admin')**
✅ **Clear error messages for unauthorized access**
✅ **Comprehensive example responses and test scenarios**
