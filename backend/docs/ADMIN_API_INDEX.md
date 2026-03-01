# Admin API Documentation Index

Complete documentation for Manas360 Admin API with 5 endpoints for user management, therapist verification, and platform analytics.

## 📚 Documentation Files

### 1. **ADMIN_API.md** - Main API Reference
Human-readable API specification with detailed endpoint documentation.

**Includes:**
- Authentication & Authorization explanation
- Error Handling reference (all HTTP codes)
- 5 Complete endpoint specifications:
  - `GET /users` - List users with pagination/filtering
  - `GET /users/{id}` - Get single user
  - `PATCH /therapists/{id}/verify` - Verify therapist
  - `GET /metrics` - Platform metrics
  - `GET /subscriptions` - List subscriptions
- Rate limiting information
- Best practices for API consumers

**Best for:** Developers reading documentation on GitHub, wikis, or documentation sites

**[→ Open ADMIN_API.md](./ADMIN_API.md)**

---

### 2. **ADMIN_API_OPENAPI.yaml** - OpenAPI/Swagger Specification
Machine-readable OpenAPI 3.0 specification for API tooling integration.

**Includes:**
- Complete endpoint definitions with parameters
- Request/response schemas with validation rules
- Security scheme (Bearer JWT authentication)
- Error response definitions
- Example field values
- Data type specifications

**Best for:**
- SwaggerUI documentation generation
- Automated API client generation
- API testing tools (Postman, Insomnia)
- API documentation portals
- IDE integrations

**How to use:**
```bash
# View in SwaggerUI (online)
https://editor.swagger.io/?url=your-raw-yaml-url

# Generate API clients
npm install @openapitools/openapi-generator-cli
openapi-generator-cli generate -i ADMIN_API_OPENAPI.yaml -g typescript-fetch -o ./generated

# Validate YAML
npm install -g swagger-cli
swagger-cli validate ADMIN_API_OPENAPI.yaml
```

**[→ Open ADMIN_API_OPENAPI.yaml](./ADMIN_API_OPENAPI.yaml)**

---

### 3. **ADMIN_API_CURL_EXAMPLES.sh** - cURL Command Reference
Executable shell script with example curl commands for each endpoint.

**Includes:**
- 12+ working curl examples covering all endpoints
- Pagination examples
- Filtering examples
- Combined filter examples
- Error scenario demonstrations (commented out)
- Response formatting tips with jq
- Rate limiting information
- Authentication setup
- Troubleshooting guide

**Best for:**
- Quick API testing without additional tools
- Integration testing scripts
- CI/CD pipeline integration
- Documentation reference
- Non-developers testing endpoints

**How to use:**
```bash
# Make executable
chmod +x ADMIN_API_CURL_EXAMPLES.sh

# Set your token
TOKEN="your_jwt_token_here"
BASE_URL="http://localhost:3000/api/v1/admin"

# Copy curl commands from script
curl -X GET "${BASE_URL}/users" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.'
```

**[→ Open ADMIN_API_CURL_EXAMPLES.sh](./ADMIN_API_CURL_EXAMPLES.sh)**

---

## 🎯 Quick Start Guide

### For Different Use Cases:

**1. I want to understand the API** → Read [ADMIN_API.md](./ADMIN_API.md)

**2. I want to integrate with tools** → Use [ADMIN_API_OPENAPI.yaml](./ADMIN_API_OPENAPI.yaml)

**3. I want to test API endpoints** → Use [ADMIN_API_CURL_EXAMPLES.sh](./ADMIN_API_CURL_EXAMPLES.sh)

**4. I want to use Postman** → Import [ADMIN_API_OPENAPI.yaml](./ADMIN_API_OPENAPI.yaml) into Postman

**5. I want to generate SDK** → Feed [ADMIN_API_OPENAPI.yaml](./ADMIN_API_OPENAPI.yaml) to OpenAPI Generator

**6. I want to run tests** → See [../tests/ADMIN_API_TESTS_README.md](../tests/ADMIN_API_TESTS_README.md)

---

## 🔐 Authentication Quick Reference

All endpoints require:
- **Header:** `Authorization: Bearer <jwt_token>`
- **Role:** Admin (validated against database)
- **Token Type:** JWT with `iat`, `exp`, `userId`, `role` claims

### Get your token:
```bash
# Login to get token
curl -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@manas360.com",
    "password": "your_password"
  }' | jq '.data.token'
```

### Validate your token:
```bash
# Decode token (requires jq and base64)
echo $TOKEN | cut -d. -f2 | base64 -d | jq '.'
```

---

## 📊 Endpoints Summary

| Method | Path | Description | Params |
|--------|------|-------------|--------|
| `GET` | `/users` | List users | page, limit, role, status |
| `GET` | `/users/{id}` | Get user | id (path) |
| `PATCH` | `/therapists/{id}/verify` | Verify therapist | id (path) |
| `GET` | `/metrics` | Platform metrics | (none) |
| `GET` | `/subscriptions` | List subscriptions | page, limit, planType, status |

**Full specs:** See [ADMIN_API.md](./ADMIN_API.md)

---

## 🧪 Testing & QA

- **Integration Tests:** See [../tests/admin/](../tests/admin/)
- **Test Documentation:** See [../tests/ADMIN_API_TESTS_README.md](../tests/ADMIN_API_TESTS_README.md)
- **Coverage Report:** See [../tests/COVERAGE_CHECKLIST.md](../tests/COVERAGE_CHECKLIST.md)

### Run tests:
```bash
cd /Users/chandu/Project/github/manas360/backend
npm test -- tests/admin/admin.integration.test.ts
```

---

## 🛠️ Tools & Integration

### SwaggerUI
Generate interactive documentation from OpenAPI spec:
```bash
npm install -D @swagger-ui/swagger-ui-dist

# Copy ADMIN_API_OPENAPI.yaml to public folder
# Access at: http://localhost:3000/swagger-ui.html
```

### Postman
1. Open Postman
2. Click "Import"
3. Upload [ADMIN_API_OPENAPI.yaml](./ADMIN_API_OPENAPI.yaml)
4. Set `{{base_url}}` and `{{token}}` variables
5. Run requests from collection

### VS Code REST Client
Create `.http` file:
```http
@base = http://localhost:3000/api/v1/admin
@token = your-jwt-token-here

### List Users
GET {{base}}/users?page=1&limit=10
Authorization: Bearer {{token}}

### Get Metrics
GET {{base}}/metrics
Authorization: Bearer {{token}}
```

### JavaScript/TypeScript Client
Generate with OpenAPI Generator:
```bash
openapi-generator-cli generate \
  -i ADMIN_API_OPENAPI.yaml \
  -g typescript-fetch \
  -o ./generated-client

# Or use manual fetch:
const response = await fetch(`${BASE_URL}/users`, {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await response.json();
```

---

## 🔍 Error Responses

All errors return JSON with `message` and optional `details`:

```json
{
  "message": "Error description",
  "details": {
    "code": "ERROR_CODE",
    "field": "optional field name",
    "errors": []
  }
}
```

### Common Status Codes:
- **200** - Success
- **400** - Validation error (invalid input)
- **401** - Auth missing or invalid
- **403** - Forbidden (not admin)
- **404** - Not found
- **410** - Gone (account deleted)
- **429** - Too many requests (rate limit)
- **500** - Server error

**Full reference:** See [ADMIN_API.md - Error Handling](./ADMIN_API.md#error-handling)

---

## 📖 Documentation Standards

All documentation follows:
- **API Spec:** OpenAPI 3.0 standard
- **Response Format:** JSON with `{success, data, message}`
- **Timestamps:** ISO 8601 UTC format
- **IDs:** PostgreSQL UUID 24-character hex strings
- **Pagination:** Page/limit model with metadata
- **Authentication:** Bearer JWT tokens
- **Rate Limiting:** Per-IP rate limits

---

## 🚀 Deployment Checklist

- [ ] Review [ADMIN_API.md](./ADMIN_API.md) for endpoint details
- [ ] Test with [ADMIN_API_CURL_EXAMPLES.sh](./ADMIN_API_CURL_EXAMPLES.sh)
- [ ] Run test suite: `npm test -- tests/admin/`
- [ ] Generate docs from [ADMIN_API_OPENAPI.yaml](./ADMIN_API_OPENAPI.yaml)
- [ ] Update frontend SDK if needed
- [ ] Brief QA team on new endpoints
- [ ] Monitor error rates in production
- [ ] Document any custom headers or requirements

---

## 📚 Related Documentation

- **RBAC Middleware:** See [../RBAC-AUDIT.md](../RBAC-AUDIT.md)
- **Test Suite:** See [../tests/ADMIN_API_TESTS_README.md](../tests/ADMIN_API_TESTS_README.md)
- **Architecture:** See [../../MANAS360_System_Architecture_v1.md](../../MANAS360_System_Architecture_v1.md)
- **Main README:** See [../../README.md](../../README.md)

---

## 📞 Support

For questions about the Admin API:
1. Check the relevant documentation file above
2. Review test examples in `tests/admin/`
3. Check source code in `src/routes/admin.routes.ts`
4. Review controllers in `src/controllers/admin.controller.ts`

---

## 📝 Document Info

| Property | Value |
|----------|-------|
| **API Version** | 1.0.0 |
| **OpenAPI Version** | 3.0.0 |
| **Last Updated** | 2024 |
| **Endpoints** | 5 |
| **Authentication** | JWT Bearer |
| **Base Path** | `/api/v1/admin` |

---

## 🔄 Version History

### v1.0.0
- Initial Admin API documentation
- Complete OpenAPI specification
- Comprehensive curl examples
- Full integration test suite
- Security audit and verification

---

**Happy coding! 🎉**

For the latest version and updates, check the [API Documentation](./ADMIN_API.md).
