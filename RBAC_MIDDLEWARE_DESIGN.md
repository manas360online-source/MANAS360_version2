# Robust RBAC Middleware System Design

## Overview

The new RBAC (Role-Based Access Control) middleware system replaces repetitive role-checking code with a scalable, secure, and flexible solution for managing access control across the application.

## Key Features

### 1. **Dynamic Role Checking**
- Uses a factory function pattern to generate middleware dynamically
- Supports both single role and multiple roles
- Highly extensible for future role additions

### 2. **Security-First Design**
- **Privilege Escalation Prevention**: Validates roles against the database, not JWT claims alone
- **Soft Deletion Protection**: Checks if user account is deleted
- **Caching with TTL**: Reduces database load while maintaining security
- **Comprehensive Logging**: Logs all unauthorized access attempts

### 3. **Configuration-Driven**
- Role hierarchy system for future permission inheritance
- Extensible role types
- Cache management capabilities

### 4. **Backward Compatibility**
- Existing `requirePatientRole`, `requireTherapistRole`, `requireAdminRole` still work
- Graceful migration path for existing code

## Architecture

### Role Hierarchy

```
superadmin (4)
    ↓
admin (3)
    ↓
therapist (2)
    ↓
patient (1)
```

Higher hierarchy levels can potentially access lower-level resources (with `requireMinimumRole`).

### Component Structure

```
┌─────────────────────────────────────────────────────────┐
│         Express Request (req.auth.userId)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │   requireRole() Factory    │
        │   (Creates Middleware)     │
        └────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ↓           ↓           ↓
    Validate    Check Role   Check
    User ID     Cache        Auth
         │           │           │
         └───────────┼───────────┘
                     ↓
        ┌────────────────────────────┐
        │   Role Cache Lookup        │
        │   (5-minute TTL)           │
        └────────────────────────────┘
                     │
              ┌──────┴──────┐
              ↓             ↓
          Hit Cache   Query Database
           (Fast)       (Accurate)
              │             │
              └──────┬──────┘
                     ↓
        ┌────────────────────────────┐
        │   Validate Role Match      │
        │   & Account Status         │
        └────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ↓                       ↓
    ✓ Authorized          ✗ Denied
    Call next()           Return 403
         │                     │
         ↓                     ↓
    Continue              Log & Exit
    Pipeline              (Security Audit)
```

## Middleware Functions

### 1. `requireRole(roles: UserRole | UserRole[])`
Main function for role-based access control.

```typescript
// Single role
requireRole('admin')

// Multiple roles
requireRole(['admin', 'superadmin'])

// Pattern: Allow access if user has ANY of the specified roles
```

**Returns**: Express middleware function

### 2. `requireMinimumRole(minimumRole: UserRole)`
Uses role hierarchy for access control.

```typescript
// Allows admin and superadmin to access therapist resources
requireMinimumRole('therapist')
```

### 3. `requirePermission(permissions: string | string[])`
Permission-based access control (future enhancement).

```typescript
requirePermission(['read_own_profile', 'book_session'])
```

### 4. `clearRoleCache(userId?: string)`
Utility function to invalidate cached roles.

```typescript
// Clear cache for specific user (after role update)
clearRoleCache(userId)

// Clear entire cache
clearRoleCache()
```

## Data Flow

### Request with Single Role

```
1. Client sends request with JWT token
2. requireAuth middleware validates JWT, sets req.auth.userId
3. requireRole('admin') middleware executes
   a. Extract userId from req.auth.userId
   b. Check role cache for userId
   c. If miss, query database (select: _id, role, isDeleted)
   d. Cache result with 5-minute TTL
   e. Validate:
      - User exists (404 if not)
      - Account not deleted (410 if deleted)
      - Role matches 'admin' (403 if not)
   f. Store role in req.auth.role
   g. Call next()
4. Controller receives request with req.auth.role available
```

### Request with Multiple Roles

```
1-3. Same as single role
   e. Validate role is in ['admin', 'superadmin'] (403 if not)
   f. Store role in req.auth.role (actual user role, not array)
   g. Call next()
4. Controller can check req.auth.role for specific role
```

## Security Guarantees

### 1. No Privilege Escalation
- Roles validated against database, not JWT claims
- JWT cannot be forged to claim higher privileges
- Soft-deleted users cannot access resources

### 2. No Race Conditions
- User deletion checked within same query result verify correct timestamp

### 3. No Cache Poisoning
- Cache TTL prevents stale role data (max 5 minutes)
- Deleted flag in cache invalidates roles
- Cache cleared after role updates

### 4. No Unauthorized Access
- User must exist in database
- User account must not be deleted
- User's actual role must match requirement
- All checks logged for audit trail

## Performance Optimization

### Caching Strategy
- **First Request**: Database query (50-100ms)
- **Subsequent Requests**: Cache hit (< 1ms) for 5 minutes
- **After Role Change**: Clear cache, next request hits database

### Database Query Optimization
- Uses `.lean()` for read-only query (faster)
- Selects only necessary fields: `_id`, `role`, `isDeleted`
- Indexed on `_id` (default) and `role` (recommended)

## Index Recommendations

```javascript
// backend/prisma/schema.prisma
model User {
  id        String   @id @default(auto()) @map("_id") @db.UUID
  role      String   @default("patient") // Add index
  isDeleted Boolean  @default(false)     // Add index
  
  @@index([role])
  @@index([isDeleted])
  @@index([role, isDeleted])  // Compound for optimal queries
}
```

## Error Responses

### 401 Unauthorized
- User not authenticated
- Missing or invalid JWT token

### 403 Forbidden
- User role doesn't match requirement
- Insufficient permissions

### 404 Not Found
- User doesn't exist in database
- Extreme edge case (user deleted between auth and RBAC check)

### 410 User Account Deleted
- User account has been soft-deleted
- User must re-enable account

### 500 Internal Server Error
- Unexpected error during role verification
- Fails securely (denies access)

## Migration Path

### Old Pattern
```typescript
router.get('/admin', requireAuth, requireAdminRole, controller)
```

### New Pattern
```typescript
router.get('/admin', requireAuth, requireRole('admin'), controller)
```

### Backward Compatibility
Old code continues to work:
```typescript
// Still functional, but deprecated
requireAdminRole  // → requireRole('admin')
requireTherapistRole  // → requireRole('therapist')
requirePatientRole  // → requireRole('patient')
```

## Future Enhancements

1. **Token-Embedded Roles**: Cache role in JWT to eliminate database lookup
2. **Permission Mapping**: Extend `requirePermission()` with full PBAC system
3. **Audit Trail**: Detailed logging of all access attempts
4. **Rate Limiting by Role**: Different limits for different roles
5. **Temporal Access Control**: Time-based access restrictions
6. **Multi-Role Support**: Users can have multiple roles simultaneously
7. **Dynamic Permissions**: Load permission matrix from database
8. **API Token Support**: Different tokens for service-to-service auth

## Testing Recommendations

1. **Unit Tests**: Test requireRole with mocked database
2. **Integration Tests**: Test with real database
3. **Security Tests**: Test privilege escalation attempts
4. **Performance Tests**: Test cache hit rates and response times
5. **Edge Cases**: Deleted users, missing roles, invalid role values

## Monitoring & Alerting

```typescript
// Track metrics
- Successful authorizations (per role)
- Failed authorizations (attempts to escalate privileges)
- Cache hit rate (target: > 90%)
- Average role lookup time (target: < 50ms on miss)

// Alert on
- Repeated 403 responses from same IP
- Cache hit rate < 70%
- Role lookup time > 200ms
- Unexpected role values
```

## Compliance & Audit

- All unauthorized access attempts logged
- User ID, timestamp, required role, actual role captured
- Admin logs available in security dashboard
- Audit trail retained for compliance (HIPAA, GDPR)
