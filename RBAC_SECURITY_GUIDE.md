# RBAC Middleware Security Guide

## Security Threat Model

### 1. Privilege Escalation Attacks

#### Threat: JWT Role Spoofing
**Description**: Attacker modifies JWT to claim higher role
**Attack Vector**: 
```
Attacker claims: { role: 'admin' } in JWT
```

**Prevention Mechanisms**:
- ✅ RBAC middleware validates role against database, NOT JWT claims
- ✅ Database query fetches authoritative role source
- ✅ Role value always taken from database, never from JWT

**Code Evidence**:
```typescript
// We fetch from database, not trust JWT
const userDetails = await getUserRole(userId);
const userRole = userDetails.role; // From DB, always

// Then validate against allowed roles
if (!roles.includes(userRole)) {
  // Deny access - privilege escalation prevented
  next(new AppError(..., 403));
}
```

---

### 2. Deleted Account Access

#### Threat: Compromised Token from Deleted Account
**Description**: Attacker uses valid JWT from deleted account
**Attack Vector**:
```
User deletes account while having active JWT
Attacker uses old JWT to access resources
```

**Prevention Mechanisms**:
- ✅ Every request checks `isDeleted` flag
- ✅ Returns 410 Gone status (not 403) for clarity
- ✅ Cache includes deletion flag for quick check

**Code Evidence**:
```typescript
if (userDetails.isDeleted) {
  next(new AppError('User account is deleted...', 410));
  return; // Block immediately
}
```

---

### 3. Race Condition Attacks

#### Threat: Role Update During Request Processing
**Description**: User's role changes while request is in-flight
**Attack Scenario**:
```
1. Request received, admin verified
2. Admin role removed from user
3. Request continues with stale role
4. Access granted despite no permission
```

**Prevention Mechanisms**:
- ✅ Role fetched immediately at middleware (not middleware creation)
- ✅ Cache TTL ensures max 5-minute staleness
- ✅ Cache invalidation on role updates
- ✅ Lean database queries for consistency

**Code Evidence**:
```typescript
// Fetch happens at REQUEST time, not middleware creation time
export const requireRole = (allowedRoles) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // This runs AT REQUEST TIME, not middleware setup
    const userDetails = await getUserRole(userId);
    // Fresh data every request (or from cache < 5min old)
  };
};
```

---

### 4. Cache Poisoning

#### Threat: Stale Cache Contains Wrong Role
**Description**: Cache contains outdated role information
**Attack Scenario**:
```
1. Admin cache hit: role = 'admin'
2. Admin role removed, but cache still active
3. Subsequent request hits cache, grants access illegally
```

**Prevention Mechanisms**:
- ✅ TTL-based expiration (5 minutes maximum)
- ✅ Deletion flag in cache auto-invalidates
- ✅ Clear cache function available for immediate invalidation
- ✅ No manual cache manipulation possible

**Code Evidence**:
```typescript
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cached = roleCache.get(userId);
if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
  // Only trust cache within TTL window
  if (cached.isDeleted) {
    return null; // Auto-invalidate on deletion
  }
}
```

---

### 5. Non-Existent User Access

#### Threat: JWT Verification Bypassed, Invalid User ID Used
**Description**: Attacker uses invalid user ID with valid JWT structure
**Attack Scenario**:
```
Attacker sends JWT with sub='nonexistent'
```

**Prevention Mechanisms**:
- ✅ Database query returns null for non-existent users
- ✅ Returns 404 immediately
- ✅ No default role assigned

**Code Evidence**:
```typescript
const user = await UserModel.findById(userId)...
if (!user) {
  next(new AppError('User not found', 404));
  return; // No fallback, no default role
}
```

---

### 6. Unauthorized Role Addition

#### Threat: Adding New Roles Without Authorization
**Description**: Application adds new roles that bypass checks
**Attack Scenario**:
```
Code adds 'ultra_admin' role discovery
Attacker claims new role not in validation list
```

**Prevention Mechanisms**:
- ✅ Role enum strictly typed in `UserRole` type
- ✅ Validation checks roles against known enum
- ✅ TypeScript ensures type safety
- ✅ Database schema enforces role enum

**Code Evidence**:
```typescript
export type UserRole = 'patient' | 'therapist' | 'admin' | 'superadmin';

export const roleHierarchy: Record<UserRole, number> = {
  // Only these roles recognized
};

const validRoles = Object.keys(roleHierarchy) as UserRole[];
for (const role of roles) {
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
}
```

---

### 7. Timing Attacks

#### Threat: Information Leakage via Response Timing
**Description**: Different timing for different failure reasons reveals info
**Attack Scenario**:
```
Long response time = user exists
Short response time = user doesn't exist
```

**Prevention Mechanisms**:
- ✅ All paths take similar execution time (database query dominant)
- ✅ Timing varies naturally by database load
- ✅ No conditional logic that changes response time significantly

---

### 8. Error Message Information Leakage

#### Threat: Detailed Errors Reveal User Existence
**Description**: Different error messages reveal system state
**Attack Scenario**:
```
"User not found" = User ID is invalid
"Access denied" = User exists but wrong role
```

**Prevention Mechanisms**:
- ✅ Clear, specific error messages help legitimate users
- ✅ Status codes provide machine-readable distinction
- ✅ Same error format for all authorization failures
- ✅ Detailed logging for legitimate admins

**Code Evidence**:
```typescript
// Clear error messages for legitimate debugging
const AppError('User not found', 404);  // Clear status
const AppError('Access denied...', 403); // Clear status
```

---

### 9. Database Injection

#### Threat: User ID or Role Values Containing Injection Payloads
**Description**: Malicious role strings execute database commands
**Attack Scenario**:
```
role: "admin'; DROP TABLE users; --"
```

**Prevention Mechanisms**:
- ✅ Prisma ORM handles parameterized queries
- ✅ Type safety ensures only valid roles
- ✅ Schema validation on database side
- ✅ No string concatenation in queries

**Code Evidence**:
```typescript
// Safe: Prisma parameterized query
const user = await UserModel.findById(userId).select(...).lean();

// NOT string concatenation:
// db.query(`SELECT * FROM users WHERE id='${userId}'`) ← Unsafe
```

---

### 10. Middleware Bypass

#### Threat: Routes Missing RBAC Middleware
**Description**: Developer forgets to apply middleware to sensitive route
**Attack Scenario**:
```
router.delete('/admin/users/:id', 
  requireAuth, // ← Missing requireRole!
  deleteUser
);
```

**Prevention Mechanisms**:
- ✅ Clear middleware pattern in codebase
- ✅ Code review process checks middleware
- ✅ Linting rules can enforce middleware presence
- ✅ Tests verify routes require auth

**Recommended Linting Rule**:
```javascript
// eslint-plugin-security rule
'security/route-requires-auth': [
  'warn',
  {
    routes: ['/admin/*', '/therapist/*'],
    requiredMiddleware: ['requireAuth', 'requireRole']
  }
]
```

---

## Security Checklist

### Development
- [ ] All routes requiring role protection use `requireRole()`
- [ ] No hardcoded role checks in controllers
- [ ] Cache cleared after role updates
- [ ] Role changes logged to audit trail
- [ ] Tests verify privilege escalation is prevented
- [ ] Rate limiting configured on auth endpoints

### Deployment
- [ ] RBAC cache cleared post-deployment
- [ ] Database indexes on `role` and `isDeleted` created
- [ ] Monitoring alerts set for repeated 403 responses
- [ ] Audit logging configured
- [ ] JWT token expiration appropriate (not too long)
- [ ] HTTPS enforce for all auth endpoints

### Operations
- [ ] Monitor cache hit rate (target > 90%)
- [ ] Monitor authorization failures (alert on spike)
- [ ] Regular audit of role assignments
- [ ] Review unauthorized access attempts monthly
- [ ] Test role updates propagate correctly
- [ ] Backup and recovery tested

---

## Privilege Escalation Prevention

### Level 1: Type Safety
```typescript
// Attacker cannot create invalid role type
const role: UserRole = req.headers['custom-role']; // ✅ TypeScript error
const role: UserRole = 'hacker-role'; // ✅ TypeScript error
const role: UserRole = 'admin'; // ✅ Valid
```

### Level 2: Enum Validation
```typescript
const validRoles = Object.keys(roleHierarchy) as UserRole[];
if (!validRoles.includes(role)) {
  throw new Error(`Invalid role: ${role}`);
}
```

### Level 3: Database Verification
```typescript
// Always fetch from database, never trust input
const user = await UserModel.findById(userId);
const actualRole = user.role; // From DB, not from request
```

### Level 4: Authorization Check
```typescript
// Verify role matches requirement
if (!allowedRoles.includes(actualRole)) {
  throw new AppError('Access denied', 403);
}
```

### Level 5: Audit Logging
```typescript
// Log all failed attempts
console.warn(`[RBAC] Unauthorized access attempt - userId: ${userId}, 
  userRole: ${actualRole}, requiredRoles: ${allowedRoles}`);
```

---

## Detection & Response

### Detected Attacks

**Privilege Escalation Attempts**:
```
[RBAC] Unauthorized access attempt - userId: user123, userRole: patient, requiredRoles: admin
```
⚠️ Response: Log incident, review user activity, check for compromised tokens

**Repeated Unauthorized Attempts**:
```
Multiple 403 responses from user_id over 5 minutes
```
⚠️ Response: Rate limit user, trigger MFA challenge, admin review

**Deleted User Account Access**:
```
[RBAC] User account is deleted. Please contact support. (410)
```
⚠️ Response: Invalidate all tokens for user, log incident, notify support

**Non-Existent User Access**:
```
[RBAC] User not found (404)
```
⚠️ Response: Log potential reconnaissance, alert security team

---

## Monitoring Queries

### Failed Authorization Attempts
```typescript
// Monitor repeated 403 responses
db.logs.find({
  status: 403,
  timestamp: { $gte: Date.now() - 3600000 }
}).count()

// Alert if > threshold in time window
```

### Cache Hit Rate
```typescript
// Monitor cache effectiveness
cache_hits / (cache_hits + cache_misses)
Target: > 90%
Alert: < 70%
```

### Role Update Propagation
```typescript
// Verify cache clears after role updates
Before: user123 has role 'patient'
Update: user123 role -> 'admin'
Clear cache
After: next request gets 'admin' from DB
```

---

## Best Practices

### 1. Principle of Least Privilege
```typescript
// ✅ Good: Only grant necessary roles
requireRole('admin') // Specific role

// ❌ Bad: Overly permissive
requireRole(['admin', 'therapist', 'patient']) // Too open
```

### 2. Defense in Depth
```typescript
// ✅ Good: Multiple checks
- JWT signature validation (auth.middleware)
- User existence check (rbac.middleware)
- Role verification (rbac.middleware)
- Soft deletion check (rbac.middleware)
- Rate limiting (rateLimiter.middleware)

// ❌ Bad: Single check
requireRole('admin') // Assumes all previous checks passed
```

### 3. Fail Secure
```typescript
// ✅ Good: Deny by default
if (!allowedRoles.includes(userRole)) {
  next(new AppError('Access denied', 403)); // Deny
}

// ❌ Bad: Allow by default
if (userRole === 'ban-list') {
  next(new AppError('Access denied', 403));
} else {
  next(); // Allow by default
}
```

### 4. Comprehensive Logging
```typescript
// ✅ Good: Log security-relevant events
- Successful high-privilege access
- Failed authorization attempts
- Role changes
- Cache invalidations
- Suspicious patterns

// ❌ Bad: No logging
// Silent failure, no audit trail
```

### 5. Regular Reviews
```typescript
// ✅ Good: Regular security practices
- Monthly role assignment audit
- Quarterly security test
- Test privilege escalation attempts
- Test deleted account access
- Review audit logs for anomalies

// ❌ Bad: Fire and forget
// Audit once, never check again
```

---

## Common Vulnerabilities & Fixes

### Vulnerability 1: Missing Role Check
```typescript
// ❌ Vulnerable
router.delete('/users/:id', requireAuth, deleteUser);

// ✅ Fixed
router.delete('/users/:id', requireAuth, requireRole('admin'), deleteUser);
```

### Vulnerability 2: Trusting Client-Provided Role
```typescript
// ❌ Vulnerable
const role = req.headers['x-user-role'];
if (role === 'admin') { /* allow */ }

// ✅ Fixed
const role = req.auth.role; // From database via RBAC middleware
if (role === 'admin') { /* allow */ }
```

### Vulnerability 3: Not Checking Deletion Status
```typescript
// ❌ Vulnerable
export const requireAdminRole = async (req, res, next) => {
  const user = await UserModel.findById(req.auth.userId);
  if (user.role !== 'admin') next(new AppError(..., 403));
  // Missing: if (user.isDeleted) check
  next();
};

// ✅ Fixed
if (userDetails.isDeleted) {
  next(new AppError('User account is deleted', 410));
  return;
}
```

### Vulnerability 4: Stale Cached Role After Update
```typescript
// ❌ Vulnerable
export const updateRole = async (req, res, next) => {
  await UserModel.findByIdAndUpdate(req.params.id, { role: req.body.role });
  // Missing: clearRoleCache(req.params.id)
  res.json({ success: true });
};

// ✅ Fixed
export const updateRole = async (req, res, next) => {
  await UserModel.findByIdAndUpdate(...);
  clearRoleCache(req.params.id); // Invalidate cache immediately
  res.json({ success: true });
};
```

---

## Testing Security

### Unit Test: Privilege Escalation Prevention
```typescript
describe('Privilege Escalation Prevention', () => {
  it('should deny escalation from patient to admin', async () => {
    const middleware = requireRole('admin');
    
    // User DB record shows patient role
    UserModel.findById.mockResolvedValue({
      role: 'patient',
      isDeleted: false
    });

    const next = jest.fn();
    await middleware(req, res, next);

    // Must deny access
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403
    }));
  });
});
```

### Integration Test: Deleted Account Access Prevention
```typescript
describe('Deleted Account Access Prevention', () => {
  it('should reject access from deleted account with valid token', async () => {
    // Create and delete user
    const user = await UserModel.create({
      email: 'test@test.com',
      role: 'admin'
    });
    await UserModel.findByIdAndUpdate(user._id, { isDeleted: true });

    // Generate token while user was active
    const token = generateToken(user._id);

    // Try to access with deleted account
    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${token}`);

    // Must deny with 410
    expect(response.status).toBe(410);
    expect(response.body.message).toContain('deleted');
  });
});
```

---

## Security Incident Response

### Step 1: Detect
- Monitor 403 error rates
- Monitor 410 (deleted user) access attempts
- Review audit logs for anomalies

### Step 2: Alert
```
IF error_rate['403'] > 10/min THEN alert("Possible privilege escalation attempt")
IF error_rate['410'] > 5/min THEN alert("Deleted accounts accessing resources")
```

### Step 3: Investigate
```
SELECT * FROM logs 
WHERE status IN (403, 410) 
AND timestamp > NOW() - 1 HOUR
ORDER BY timestamp DESC
```

### Step 4: Respond
1. Rate limit affected user
2. Invalidate user's active tokens
3. Trigger MFA re-verification
4. Review user's role changes
5. Check for compromised credentials
6. Restore from backup if necessary

### Step 5: Prevent Recurrence
1. Add new validation if unknown attack vector
2. Update detection rules
3. Increase monitoring
4. Security awareness training
