# Admin User Management API - Quick Reference

> Migration note (March 2026): Admin user-listing endpoints are Prisma-backed. Therapist verification endpoint is temporarily unavailable (`501`) until therapist profile Prisma models are completed.

## Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/admin/users` | GET | Admin | List all users with pagination & filtering |
| `/api/v1/admin/users/:id` | GET | Admin | Get single user details by ID |

---

## List Users - Quick Examples

### Get First 10 Users (Active)
```bash
curl -X GET "https://api.manas360.com/api/v1/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get All Patient Users
```bash
curl -X GET "https://api.manas360.com/api/v1/admin/users?role=patient&page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### Get All Therapist Users
```bash
curl -X GET "https://api.manas360.com/api/v1/admin/users?role=therapist" \
  -H "Authorization: Bearer $TOKEN"
```

### Get All Admins
```bash
curl -X GET "https://api.manas360.com/api/v1/admin/users?role=admin" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Deleted Users
```bash
curl -X GET "https://api.manas360.com/api/v1/admin/users?status=deleted&page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Get User Details - Quick Examples

### Basic Request
```bash
curl -X GET "https://api.manas360.com/api/v1/admin/users/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN"
```

### Pretty Print JSON
```bash
curl -X GET "https://api.manas360.com/api/v1/admin/users/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Extract Specific Fields
```bash
curl -X GET "https://api.manas360.com/api/v1/admin/users/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {name, email, role, createdAt}'
```

---

## Query Parameters

### role
- `patient` - Filter to patient users only
- `therapist` - Filter to therapist users only  
- `admin` - Filter to admin users only
- (omit) - Returns all roles

### status
- `active` - Only active users (default)
- `deleted` - Only soft-deleted users
- (omit) - Defaults to active only

### page
- Default: `1`
- Min: `1`
- Used with `limit` for pagination

### limit
- Default: `10`
- Min: `1`
- Max: `50`
- Limits results per page

---

## Response Structure

### Success (200 OK)
```json
{
  "success": true,
  "message": "...",
  "data": {
    "data": [...],  // For list: array, For get: single object
    "meta": {...}   // For list: pagination info, For get: not included
  }
}
```

### Error (400, 401, 403, 404, 422, 500)
```json
{
  "success": false,
  "message": "...",
  "errors": [...]  // Optional, only for validation errors
}
```

---

## User Object Fields (Returned)

```typescript
{
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  profileImageUrl?: string;
  googleId?: string;
  role: 'patient' | 'therapist' | 'admin';
  provider: 'local' | 'google' | 'phone';
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}
```

### Excluded Fields (Never Returned)
- `passwordHash` - Hashed password
- `emailVerificationOtpHash` - Email OTP hash
- `phoneVerificationOtpHash` - Phone OTP hash
- `passwordResetOtpHash` - Password reset OTP hash
- `mfaSecret` - MFA secret key
- `refreshTokens` - Refresh token array

---

## Pagination Metadata

```typescript
{
  page: number;           // Current page (1-indexed)
  limit: number;          // Items per page
  totalItems: number;     // Total matching users
  totalPages: number;     // Pages available
  hasNextPage: boolean;   // More pages exist?
  hasPrevPage: boolean;   // Previous page exists?
}
```

---

## Error Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Invalid query/parameter value |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | User doesn't have admin role |
| 404 | Not Found | User doesn't exist |
| 422 | Validation Error | Invalid query parameters |
| 500 | Server Error | Unexpected server error |

---

## Common Scenarios

### Scenario 1: List All Active Patient Users (Paginated)
```bash
#!/bin/bash
TOKEN="your-jwt-token"
PAGE=1
LIMIT=50

while true; do
  RESPONSE=$(curl -s -X GET \
    "https://api.manas360.com/api/v1/admin/users?role=patient&page=$PAGE&limit=$LIMIT" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "$RESPONSE" | jq '.data.data[] | {name, email, role}'
  
  HAS_NEXT=$(echo "$RESPONSE" | jq '.data.meta.hasNextPage')
  [ "$HAS_NEXT" == "true" ] || break
  
  PAGE=$((PAGE + 1))
done
```

### Scenario 2: Count Users by Role
```bash
#!/bin/bash
TOKEN="your-jwt-token"

for role in patient therapist admin; do
  COUNT=$(curl -s -X GET \
    "https://api.manas360.com/api/v1/admin/users?role=$role&limit=1" \
    -H "Authorization: Bearer $TOKEN" | jq '.data.meta.totalItems')
  echo "$role: $COUNT"
done
```

### Scenario 3: Export All User Emails
```bash
#!/bin/bash
TOKEN="your-jwt-token"

curl -s -X GET "https://api.manas360.com/api/v1/admin/users?limit=50" \
  -H "Authorization: Bearer $TOKEN" | \
  jq -r '.data.data[] | .email' > users.txt
```

### Scenario 4: Find User by Email
```bash
#!/bin/bash
TOKEN="your-jwt-token"
EMAIL="john@example.com"

# List all users and filter by email (not ideal, but works)
curl -s -X GET "https://api.manas360.com/api/v1/admin/users?limit=50" \
  -H "Authorization: Bearer $TOKEN" | \
  jq ".data.data[] | select(.email == \"$EMAIL\")"

# Note: For better performance, consider adding email search endpoint
```

### Scenario 5: Audit Deleted Accounts
```bash
#!/bin/bash
TOKEN="your-jwt-token"

curl -s -X GET "https://api.manas360.com/api/v1/admin/users?status=deleted&limit=50" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.data.data[] | {name, email, role, deletedAt}'
```

---

## Authentication Setup

### Step 1: Login to Get Token
```bash
TOKEN=$(curl -s -X POST https://api.manas360.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin-password"
  }' | jq -r '.data.token')

echo $TOKEN
```

### Step 2: Use Token in Requests
```bash
curl -X GET https://api.manas360.com/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

### Step 3: Save for Later Use
```bash
# In ~/.bashrc or ~/.zshrc
export MANAS_ADMIN_TOKEN="your-token-here"

# Then use in requests
curl -X GET https://api.manas360.com/api/v1/admin/users \
  -H "Authorization: Bearer $MANAS_ADMIN_TOKEN"
```

---

## Implementation Files

### Created/Modified Files

**New Files:**
- `src/services/admin.service.ts` - Service layer with listUsers & getUserById
- `src/controllers/admin.controller.ts` - Controller layer with handlers
- `src/routes/admin.routes.ts` - Route definitions

**Modified Files:**
- `src/middleware/rbac.middleware.ts` - Added requireAdminRole
- `src/middleware/validate.middleware.ts` - Added validation schemas
- `src/routes/index.ts` - Registered admin routes
- `src/types/express.d.ts` - Added TypeScript types

### Code Structure
```
Request → Route Handler → Auth → RBAC → Validation → Controller → Service → Model
```

### Key Functions
```typescript
requireAdminRole()           // RBAC middleware
validateAdminListUsersQuery // Query validation
validateAdminGetUserIdParam // Path param validation
listUsers()                 // Service: list with filters
getUserById()               // Service: get single user
listUsersController()        // Controller: list handler
getUserController()          // Controller: get handler
```

---

## Rate Limiting (Recommended)

**To implement:**
```typescript
// Add to routes/admin.routes.ts
import { rateLimit } from 'express-rate-limit';

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 100,                  // 100 requests per minute
  message: 'Too many requests from this admin'
});

router.get('/users', 
  requireAuth, 
  requireAdminRole,
  adminLimiter,
  ...validateAdminListUsersQuery,
  asyncHandler(listUsersController)
);
```

---

## Audit Logging (Recommended)

**To implement:**
```typescript
// In controller
logger.audit({
  action: 'ADMIN_LIST_USERS',
  adminUserId: req.auth.userId,
  filters: req.validatedAdminListUsersQuery,
  timestamp: new Date(),
  resultCount: response.data.length
});
```

---

## Troubleshooting

### 401 Unauthorized
- Check token is valid: `jq -R 'split(".") | .[1] | @base64d' <<< "$TOKEN"`
- Token may have expired (re-login)
- Check Authorization header format: `Bearer <token>`

### 403 Forbidden
- User must have `role === 'admin'`
- Check user is not deleted: `isDeleted === false`
- Verify in database via Prisma/PostgreSQL admin user record

### 422 Unprocessable Entity
- Check query param values are valid
- role must be: `patient`, `therapist`, `admin`
- status must be: `active`, `deleted`
- page must be: integer ≥ 1
- limit must be: integer, 1-50

### 404 Not Found
- User doesn't exist
- Check user ID value is correct
- Try: `curl -X GET /api/v1/admin/users | jq '.data.data[0].id'`

### 500 Server Error
- Check server logs
- Verify database connection
- Ensure PostgreSQL is running and reachable

---

## Performance Tips

1. **Use pagination for large datasets**
   - Don't request all users at once
   - Use `limit=50` and iterate pages

2. **Filter to reduce results**
   - `?role=patient` returns only patients
   - `?status=deleted` returns only deleted accounts

3. **Cache results if needed**
   - Results are point-in-time snapshots
   - Re-query for updated data

4. **Batch requests carefully**
   - Don't make 10,000 individual user requests
   - Use list endpoint with pagination instead

---

## API Documentation

For detailed documentation, see:
- `ADMIN_USER_MANAGEMENT_API.md` - Full endpoint documentation
- `ADMIN_ARCHITECTURE_SECURITY.md` - Architecture & security analysis

---

**API Base URL:** https://api.manas360.com/api/v1/admin  
**Version:** 1.0.0  
**Last Updated:** February 27, 2026  
**Status:** Production Ready ✅
