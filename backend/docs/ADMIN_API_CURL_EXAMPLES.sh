#!/bin/bash
# Manas360 Admin API - cURL Examples
# This file contains example curl commands for testing the Admin API endpoints
# Usage: Replace $TOKEN with your actual JWT bearer token and $BASE_URL with your API endpoint

# Configuration
BASE_URL="http://localhost:3000/api/v1/admin"
TOKEN="your_jwt_token_here"
CONTENT_TYPE="Content-Type: application/json"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Manas360 Admin API - cURL Examples${NC}\n"

# ============================================================================
# 1. LIST USERS - Basic
# ============================================================================
echo -e "${GREEN}1. List Users (Default pagination: page=1, limit=10)${NC}"
curl -X GET \
  "${BASE_URL}/users" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 2. LIST USERS - With Pagination
# ============================================================================
echo -e "${GREEN}2. List Users (Page 2, limit 20)${NC}"
curl -X GET \
  "${BASE_URL}/users?page=2&limit=20" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 3. LIST USERS - Filter by Role
# ============================================================================
echo -e "${GREEN}3. List Users (Filter by therapist role)${NC}"
curl -X GET \
  "${BASE_URL}/users?role=therapist&limit=50" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 4. LIST USERS - Filter by Status
# ============================================================================
echo -e "${GREEN}4. List Users (Show only deleted accounts)${NC}"
curl -X GET \
  "${BASE_URL}/users?status=deleted" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 5. LIST USERS - Combined Filters
# ============================================================================
echo -e "${GREEN}5. List Users (Filter by patient role + active status, page 1, limit 25)${NC}"
curl -X GET \
  "${BASE_URL}/users?role=patient&status=active&page=1&limit=25" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 6. GET SINGLE USER
# ============================================================================
echo -e "${GREEN}6. Get Single User (Replace USER_ID with actual PostgreSQL UUID)${NC}"
curl -X GET \
  "${BASE_URL}/users/650f8c9e7d9f8b1a2c3d4e5f" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 7. VERIFY THERAPIST
# ============================================================================
echo -e "${GREEN}7. Verify Therapist (Mark therapist profile as verified)${NC}"
curl -X PATCH \
  "${BASE_URL}/therapists/650f8c9e7d9f8b1a2c3d4e5f/verify" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  -d '{}' \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 8. GET PLATFORM METRICS
# ============================================================================
echo -e "${GREEN}8. Get Platform Metrics (Aggregated statistics)${NC}"
curl -X GET \
  "${BASE_URL}/metrics" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 9. LIST SUBSCRIPTIONS - All Active
# ============================================================================
echo -e "${GREEN}9. List Subscriptions (All active subscriptions, default pagination)${NC}"
curl -X GET \
  "${BASE_URL}/subscriptions" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 10. LIST SUBSCRIPTIONS - Filter by Plan Type
# ============================================================================
echo -e "${GREEN}10. List Subscriptions (Filter by premium plan)${NC}"
curl -X GET \
  "${BASE_URL}/subscriptions?planType=premium&limit=50" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 11. LIST SUBSCRIPTIONS - Filter by Status
# ============================================================================
echo -e "${GREEN}11. List Subscriptions (Show expired subscriptions)${NC}"
curl -X GET \
  "${BASE_URL}/subscriptions?status=expired&limit=50" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# 12. LIST SUBSCRIPTIONS - Multiple Filters
# ============================================================================
echo -e "${GREEN}12. List Subscriptions (Pro plan + active status, page 1, limit 20)${NC}"
curl -X GET \
  "${BASE_URL}/subscriptions?planType=pro&status=active&page=1&limit=20" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "${CONTENT_TYPE}" \
  | jq '.'

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# ERROR SCENARIOS - Uncomment to test error responses
# ============================================================================

# ============================================================================
# ERROR 1: Missing Authorization Header
# ============================================================================
echo -e "${YELLOW}ERROR TEST 1: Missing Authorization Header (Should return 401)${NC}"
# curl -X GET \
#   "${BASE_URL}/users" \
#   -H "${CONTENT_TYPE}" \
#   | jq '.'
# Expected Response:
#   {
#     "message": "Authentication required",
#     "details": {
#       "code": "AUTH_MISSING"
#     }
#   }

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# ERROR 2: Invalid JWT Token
# ============================================================================
echo -e "${YELLOW}ERROR TEST 2: Invalid JWT Token (Should return 401)${NC}"
# curl -X GET \
#   "${BASE_URL}/users" \
#   -H "Authorization: Bearer invalid_token_here" \
#   -H "${CONTENT_TYPE}" \
#   | jq '.'
# Expected Response:
#   {
#     "message": "Invalid or expired token",
#     "details": {
#       "code": "AUTH_INVALID"
#     }
#   }

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# ERROR 3: Non-Admin User (Should return 403)
# ============================================================================
echo -e "${YELLOW}ERROR TEST 3: Non-Admin User Token (Should return 403)${NC}"
# curl -X GET \
#   "${BASE_URL}/users" \
#   -H "Authorization: Bearer patient_token_here" \
#   -H "${CONTENT_TYPE}" \
#   | jq '.'
# Expected Response:
#   {
#     "message": "Insufficient permissions",
#     "details": {
#       "code": "AUTH_FORBIDDEN",
#       "required": "admin"
#     }
#   }

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# ERROR 4: Deleted User Account (Should return 410)
# ============================================================================
echo -e "${YELLOW}ERROR TEST 4: Deleted User Account (Should return 410)${NC}"
# curl -X GET \
#   "${BASE_URL}/users/650f8c9e7d9f8b1a2c3d4e5f" \
#   -H "Authorization: Bearer token_of_deleted_admin" \
#   -H "${CONTENT_TYPE}" \
#   | jq '.'
# Expected Response:
#   {
#     "message": "User account has been deleted",
#     "details": {
#       "code": "ACCOUNT_DELETED"
#     }
#   }

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# ERROR 5: Invalid Input Parameters
# ============================================================================
echo -e "${YELLOW}ERROR TEST 5: Invalid Pagination Parameters (Should return 400)${NC}"
# curl -X GET \
#   "${BASE_URL}/users?page=abc&limit=invalid" \
#   -H "Authorization: Bearer ${TOKEN}" \
#   -H "${CONTENT_TYPE}" \
#   | jq '.'
# Expected Response:
#   {
#     "message": "Validation failed",
#     "details": {
#       "errors": [
#         {
#           "field": "page",
#           "message": "Must be a positive integer"
#         },
#         {
#           "field": "limit",
#           "message": "Must be a positive integer between 1 and 50"
#         }
#       ]
#     }
#   }

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# ERROR 6: Invalid UUID Format
# ============================================================================
echo -e "${YELLOW}ERROR TEST 6: Invalid UUID Format (Should return 400)${NC}"
# curl -X GET \
#   "${BASE_URL}/users/not_a_valid_id" \
#   -H "Authorization: Bearer ${TOKEN}" \
#   -H "${CONTENT_TYPE}" \
#   | jq '.'
# Expected Response:
#   {
#     "message": "Validation failed",
#     "details": {
#       "errors": [
#         {
#           "field": "id",
#           "message": "Invalid PostgreSQL UUID format"
#         }
#       ]
#     }
#   }

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# ERROR 7: Resource Not Found
# ============================================================================
echo -e "${YELLOW}ERROR TEST 7: Non-existent User (Should return 404)${NC}"
# curl -X GET \
#   "${BASE_URL}/users/000000000000000000000000" \
#   -H "Authorization: Bearer ${TOKEN}" \
#   -H "${CONTENT_TYPE}" \
#   | jq '.'
# Expected Response:
#   {
#     "message": "User not found"
#   }

echo -e "\n${YELLOW}---${NC}\n"

# ============================================================================
# RESPONSE FORMATTING TIPS
# ============================================================================
echo -e "${GREEN}Response Formatting Tips:${NC}"
echo "1. Pretty print JSON response using jq:"
echo "   curl ... | jq '.'"
echo ""
echo "2. Extract specific field:"
echo "   curl ... | jq '.data.users'"
echo ""
echo "3. Get response headers:"
echo "   curl -i -X GET ..."
echo ""
echo "4. Save response to file:"
echo "   curl ... > response.json"
echo ""
echo "5. View request headers:"
echo "   curl -v -X GET ..."
echo ""
echo "6. Get only status code:"
echo "   curl -s -o /dev/null -w '%{http_code}' ..."
echo ""

# ============================================================================
# USEFUL JQ COMMANDS
# ============================================================================
echo -e "\n${GREEN}Useful jq Commands:${NC}"
echo "1. Extract array of user emails:"
echo "   curl ... | jq '.data.users[].email'"
echo ""
echo "2. Count total users:"
echo "   curl ... | jq '.data.pagination.total'"
echo ""
echo "3. Filter users by role:"
echo "   curl ... | jq '.data.users[] | select(.role==\"therapist\")'"
echo ""
echo "4. Get first user:"
echo "   curl ... | jq '.data.users[0]'"
echo ""
echo "5. Format with custom fields:"
echo "   curl ... | jq '{email: .data.users[].email, role: .data.users[].role}'"
echo ""

# ============================================================================
# RATE LIMITING INFO
# ============================================================================
echo -e "\n${GREEN}Rate Limiting:${NC}"
echo "- Limit: 100 requests per minute per IP"
echo "- Headers in response:"
echo "  X-RateLimit-Limit: 100"
echo "  X-RateLimit-Remaining: 99"
echo "  X-RateLimit-Reset: [timestamp]"
echo ""
echo "- Check rate limit:"
echo "  curl -i ... | grep -i 'X-RateLimit'"
echo ""

# ============================================================================
# AUTHENTICATION SETUP
# ============================================================================
echo -e "\n${GREEN}Authentication Setup:${NC}"
echo "1. Obtain JWT token from /api/v1/auth/login endpoint"
echo "2. Token format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "3. Include in Authorization header:"
echo "   Authorization: Bearer YOUR_TOKEN_HERE"
echo "4. Token must be from account with admin role"
echo "5. If account is deleted, token will be rejected with 410 Gone"
echo ""

# ============================================================================
# COMMON ISSUES & TROUBLESHOOTING
# ============================================================================
echo -e "\n${GREEN}Common Issues & Troubleshooting:${NC}"
echo ""
echo "Issue: 401 Unauthorized"
echo "  → Check token is valid and hasn't expired"
echo "  → Verify token includes in Authorization header"
echo "  → Format: 'Authorization: Bearer <token>'"
echo ""
echo "Issue: 403 Forbidden"
echo "  → User account doesn't have admin role"
echo "  → Verify role in database: db.users.findOne({_id: UUID('...')})"
echo "  → Check role is exactly 'admin' (case-sensitive)"
echo ""
echo "Issue: 410 Gone"
echo "  → Your admin account has been deleted (isDeleted: true)"
echo "  → Login with different admin account"
echo "  → Or restore account in database"
echo ""
echo "Issue: 400 Bad Request"
echo "  → Check parameter types (page should be integer, not string)"
echo "  → Verify enum values (role must be: patient, therapist, admin)"
echo "  → Validate UUID format for path parameters"
echo ""
echo "Issue: 500 Internal Server Error"
echo "  → Check server logs for details"
echo "  → Verify database connection is working"
echo "  → For metrics endpoint, check aggregation pipeline"
echo ""
