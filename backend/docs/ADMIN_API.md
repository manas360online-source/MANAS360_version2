# Admin API Documentation

**Version**: 1.0  
**Base URL**: `/api/v1/admin`  
**Authentication**: JWT Bearer Token (Admin role required)  
**Content-Type**: `application/json`

---

## Migration Status (March 2026)

Admin APIs are migrated to Prisma/PostgreSQL. The therapist verification endpoint is temporarily unavailable and returns `501 Not Implemented` until therapist profile models are finalized in Prisma.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Error Handling](#error-handling)
3. [Endpoints](#endpoints)
   - [List Users](#get-users)
   - [Get User](#get-usersid)
   - [Verify Therapist](#patch-therapistsidverify)
   - [Get Metrics](#get-metrics)
   - [List Subscriptions](#get-subscriptions)

---

## Authentication & Authorization

### JWT Token

All Admin API endpoints require a valid JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Role Requirement

- **Required Role**: `admin`
- **Token Claims**:
  - `userId`: Authenticated user identifier
  - `sessionId`: Active session identifier
  - `jti`: JWT ID (unique identifier)

### How It Works

1. Token is validated via `requireAuth` middleware
2. User role is fetched from database (not from JWT claims)
3. Role is verified against `admin` requirement via `requireRole('admin')` middleware
4. If user is deleted (soft deletion), request returns **410 Gone**

---

## Error Handling

### Response Format (All Errors)

```json
{
  "message": "Error description",
  "details": {}
}
```

### HTTP Status Codes

| Code | Meaning | Cause |
|------|---------|-------|
| **200** | OK | Request successful |
| **400** | Bad Request | Invalid parameters, validation failed |
| **401** | Unauthorized | Missing or invalid JWT token |
| **403** | Forbidden | User is authenticated but not admin role |
| **404** | Not Found | Resource doesn't exist |
| **410** | Gone | User account has been deleted (soft deletion) |
| **500** | Server Error | Internal server error |

### Common Error Scenarios

#### 401 Unauthorized
```json
{
  "message": "Authentication required"
}
```
**Causes**:
- Missing Authorization header
- Invalid JWT signature
- Expired JWT token

#### 403 Forbidden
```json
{
  "message": "Admin role required"
}
```
**Causes**:
- User is authenticated but has role: `patient` or `therapist`
- User doesn't have admin privileges

#### 410 Gone
```json
{
  "message": "User not found or has been deleted"
}
```
**Causes**:
- Admin account has been deleted (soft deletion)
- User accessing deleted resource

---

## Endpoints

### GET /users

Retrieve a paginated list of all users with optional filtering.

#### Request

**Method**: `GET`  
**Authentication**: ✅ Required (Admin)  
**Role**: ✅ Admin only

**Query Parameters**:

| Parameter | Type | Required | Default | Max | Description |
|-----------|------|----------|---------|-----|-------------|
| `page` | number | No | 1 | - | Page number for pagination |
| `limit` | number | No | 10 | 50 | Items per page (max 50) |
| `role` | string | No | - | - | Filter by user role: `patient`, `therapist`, `admin` |
| `status` | string | No | - | - | Filter by status: `active`, `deleted` |

**Example Request**:
```http
GET /api/v1/admin/users?page=1&limit=10&role=patient HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Validation Rules

| Parameter | Rule |
|-----------|------|
| `page` | Must be positive integer ≥ 1 |
| `limit` | Must be 1-50 (capped at 50 if higher) |
| `role` | Must be one of: `patient`, `therapist`, `admin` |
| `status` | Must be one of: `active`, `deleted` |

#### Success Response

**Status Code**: `200 OK`

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "email": "john.doe@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "patient",
        "isEmailVerified": true,
        "isDeleted": false,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-02-27T14:22:15Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  },
  "message": "Users fetched successfully"
}
```

#### Error Responses

| Status | Scenario |
|--------|----------|
| **400** | Invalid `page` or `limit` values |
| **400** | Invalid `role` or `status` filter value |
| **401** | Missing or invalid authentication token |
| **403** | Non-admin user attempting access |
| **410** | Authenticated user's account has been deleted |

---

### GET /users/:id

Retrieve details of a single user by ID.

#### Request

**Method**: `GET`  
**Authentication**: ✅ Required (Admin)  
**Role**: ✅ Admin only  
**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ Yes | User identifier |

**Example Request**:
```http
GET /api/v1/admin/users/507f1f77bcf86cd799439011 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Validation Rules

| Parameter | Rule |
|-----------|------|
| `id` | Must be a non-empty user ID string |

#### Success Response

**Status Code**: `200 OK`

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "patient",
    "phoneNumber": "+919876543210",
    "isEmailVerified": true,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-02-27T14:22:15Z"
  },
  "message": "User fetched successfully"
}
```

#### Error Responses

| Status | Scenario |
|--------|----------|
| **400** | Invalid user ID format |
| **401** | Missing or invalid authentication token |
| **403** | Non-admin user attempting access |
| **404** | User with given ID doesn't exist |
| **410** | User has been deleted OR authenticated admin account deleted |

---

### PATCH /therapists/:id/verify

Verify a therapist's credentials and mark profile as verified.

> Current status: This endpoint is temporarily unavailable and returns `501 Not Implemented`.

#### Request

**Method**: `PATCH`  
**Authentication**: ✅ Required (Admin)  
**Role**: ✅ Admin only  
**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ Yes | Therapist profile identifier |

**Request Body**: None (empty body)

**Example Request**:
```http
PATCH /api/v1/admin/therapists/607f1f77bcf86cd799439022/verify HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Content-Length: 0
```

#### Current Response

**Status Code**: `501 Not Implemented`

```json
{
  "success": false,
  "message": "Therapist verification temporarily unavailable during Prisma migration"
}
```

#### Error Responses

| Status | Scenario |
|--------|----------|
| **401** | Missing or invalid authentication token |
| **403** | Non-admin user attempting access |
| **501** | Endpoint temporarily disabled during Prisma migration |
| **410** | Authenticated admin account has been deleted |

---

### GET /metrics

Retrieve comprehensive platform metrics and statistics.

#### Request

**Method**: `GET`  
**Authentication**: ✅ Required (Admin)  
**Role**: ✅ Admin only  
**Query Parameters**: None

**Example Request**:
```http
GET /api/v1/admin/metrics HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response

**Status Code**: `200 OK`

```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalTherapists": 85,
    "verifiedTherapists": 72,
    "completedSessions": 4320,
    "totalRevenue": 125750,
    "activeSubscriptions": 420
  },
  "message": "Platform metrics retrieved successfully"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `totalUsers` | number | Count of all active (non-deleted) users |
| `totalTherapists` | number | Count of therapist profiles |
| `verifiedTherapists` | number | Count of verified therapist profiles |
| `completedSessions` | number | Count of completed therapy sessions |
| `totalRevenue` | number | Sum of all successful payment amounts (in base currency units) |
| `activeSubscriptions` | number | Count of active (non-expired) subscriptions |

#### Error Responses

| Status | Scenario |
|--------|----------|
| **401** | Missing or invalid authentication token |
| **403** | Non-admin user attempting access |
| **410** | Authenticated admin account has been deleted |
| **500** | Server error during metric calculation |

---

### GET /subscriptions

Retrieve a paginated list of subscriptions with optional filtering.

#### Request

**Method**: `GET`  
**Authentication**: ✅ Required (Admin)  
**Role**: ✅ Admin only

**Query Parameters**:

| Parameter | Type | Required | Default | Max | Description |
|-----------|------|----------|---------|-----|-------------|
| `page` | number | No | 1 | - | Page number for pagination |
| `limit` | number | No | 10 | 50 | Items per page (max 50) |
| `planType` | string | No | - | - | Filter by plan: `basic`, `premium`, `pro` |
| `status` | string | No | `active` | - | Filter by status: `active`, `expired`, `cancelled`, `paused` |

**Example Request**:
```http
GET /api/v1/admin/subscriptions?page=1&limit=20&status=active&planType=premium HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Validation Rules

| Parameter | Rule |
|-----------|------|
| `page` | Must be positive integer ≥ 1 |
| `limit` | Must be 1-50 (capped at 50 if higher) |
| `planType` | Must be one of: `basic`, `premium`, `pro` |
| `status` | Must be one of: `active`, `expired`, `cancelled`, `paused` |

#### Success Response

**Status Code**: `200 OK`

```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "userId": "507f1f77bcf86cd799439011",
        "planType": "premium",
        "status": "active",
        "startDate": "2024-01-15T00:00:00Z",
        "endDate": "2024-04-15T00:00:00Z",
        "autoRenew": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-02-27T14:22:15Z",
        "user": {
          "_id": "507f1f77bcf86cd799439011",
          "email": "user@example.com",
          "firstName": "Jane",
          "lastName": "Smith"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 420,
      "totalPages": 21
    }
  },
  "message": "Subscriptions fetched successfully"
}
```

#### Error Responses

| Status | Scenario |
|--------|----------|
| **400** | Invalid `page` or `limit` values |
| **400** | Invalid `planType` or `status` filter value |
| **401** | Missing or invalid authentication token |
| **403** | Non-admin user attempting access |
| **410** | Authenticated admin account has been deleted |

---

## Rate Limiting

Admin API endpoints are subject to rate limiting to prevent abuse:

- **Limit**: 100 requests per minute per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

If rate limit exceeded:
```json
{
  "message": "Too many requests. Please try again later."
}
```
**Status Code**: `429 Too Many Requests`

---

## Best Practices

### 1. Pagination
Always use pagination for list endpoints (`/users`, `/subscriptions`) to avoid large responses:
- Start with `page=1, limit=10`
- Use `totalPages` from response to iterate through pages
- Maximum `limit` is 50 items per page

### 2. Filtering
Use filters to reduce dataset size:
```
GET /api/v1/admin/users?role=therapist&status=active
GET /api/v1/admin/subscriptions?planType=premium&status=active
```

### 3. Token Management
- Store JWT tokens securely (not in localStorage if possible)
- Refresh tokens before expiration
- Remove tokens on logout
- Use HTTPS for all API calls

### 4. Error Handling
- Always check `status` code first
- Use `message` field for user-facing errors
- Use `details` field for debugging information
- Handle **410 Gone** by re-authenticating

### 5. Timestamp Handling
All timestamps are in ISO 8601 format (UTC):
```
2024-02-27T14:25:30Z
```

---

## See Also

- [Test Suite Documentation](./ADMIN_API_TESTS_README.md)
- [OpenAPI Specification](./ADMIN_API_OPENAPI.yaml)
- [Example curl Commands](./ADMIN_API_CURL_EXAMPLES.sh)
