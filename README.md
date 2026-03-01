# Manas360 Backend

**Tech Stack**

- **Backend:** Node.js, TypeScript, Express, Prisma (PostgreSQL), PostgreSQL, Redis, BullMQ (background jobs), Socket.io, AWS S3 SDK for exports.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, @tanstack/react-query, Recharts, react-window, react-virtualized-auto-sizer.
- **Dev & Tooling:** ESLint, Prettier, Jest (backend tests), Vitest (frontend), TypeScript, ts-node-dev for local dev.

**Run Locally (quickstart)**

Prerequisites: Node 18+, npm (or yarn), Docker (optional, for Postgres/Redis), and access to required environment variables (see `.env.example`).

- Start Postgres and Redis (Docker examples):

	```bash
	docker run -d --name manas-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=manas -p 5432:5432 postgres:15
	docker run -d --name manas-redis -p 6379:6379 redis:7
	```

- Backend (development):

	```bash
	cd backend
	cp .env.example .env
	npm install
	npx prisma generate
	npx prisma migrate dev --name init
	npm run dev
	```

	Notes:
	- Required env vars include `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, AWS S3 credentials for export uploads, and other values in `.env.example`.
	- Background workers (export processing, rollups) are instantiated by the backend when it starts; no separate process is required in development.

- Frontend (development):

	```bash
	cd frontend
	cp .env.example .env
	npm install
	npm run dev
	```

- Run tests:

	```bash
	# Backend tests
	cd backend
	npm test

	# Frontend typecheck / tests
	cd frontend
	npm run typecheck
	npm test
	```

**Useful commands**

- `npm run dev` (backend) — run development server with automatic reload.
- `npm run build` (backend) — compile TypeScript to `dist/`.
- `npm run dev` (frontend) — start Vite dev server.
- `npx prisma migrate dev` — run Prisma migrations (development).

**Troubleshooting**

- If database/connectivity errors appear, verify `DATABASE_URL` and `REDIS_URL` and that Postgres/Redis are reachable.
- If Prisma schema changed, run `npx prisma generate` and `npx prisma migrate dev` before starting backend.
- If exports fail, ensure AWS S3 credentials are present and that `REDIS_URL` is configured for the queue.

---

## Authentication System (User Story 2.1)

Production-ready authentication has been initialized using Node.js, Express, PostgreSQL (Prisma), JWT, and secure middleware patterns.

### Implemented Scope

- Email/password signup with bcrypt hashing
- Email OTP verification flow
- Phone OTP registration & verification flow
- Google OAuth login flow (ID token verification)
- JWT access token (15m) and refresh token (7d)
- Refresh token rotation and replay resistance
- Password reset OTP flow
- Optional MFA setup and verification (TOTP)
- Session management and session revocation
- Login audit trail (IP, user agent, event status)
- Brute-force mitigation:
  - Rate limiting: 5 attempts / 15 minutes
  - Account lockout after 5 failed attempts

### Security Controls

- Password hashing: bcrypt (`saltRounds=12`)
- Refresh tokens stored as SHA-256 hashes in DB
- Access/refresh tokens delivered in HTTP-only cookies
- CSRF double-submit token check (`x-csrf-token` vs cookie)
- Helmet for secure HTTP headers (XSS / hardening baseline)
- Audit log for critical auth events and failures

### Backend Setup

1. Go to backend:
	- `cd backend`
2. Install dependencies:
	- `npm install`
3. Configure environment:
	- copy `.env.example` to `.env`
4. Run in development:
	- `npm run dev`

### API Summary

| Method | Endpoint | Purpose | Auth | Rate Limit |
|---|---|---|---|---|
| POST | `/api/auth/signup/email` | Register with email/password | No | Yes |
| POST | `/api/auth/verify/email-otp` | Verify email OTP | No | Yes |
| POST | `/api/auth/signup/phone` | Register with phone | No | Yes |
| POST | `/api/auth/verify/phone-otp` | Verify phone OTP | No | Yes |
| POST | `/api/auth/login` | Login with identifier/password | No | Yes |
| POST | `/api/auth/login/google` | Login with Google ID token | No | Yes |
| POST | `/api/auth/refresh` | Rotate refresh/access tokens | CSRF | Yes |
| POST | `/api/auth/password/forgot` | Request password reset OTP | No | Yes |
| POST | `/api/auth/password/reset` | Reset password with OTP | No | Yes |
| POST | `/api/auth/mfa/setup` | Initialize MFA secret | Access token | No |
| POST | `/api/auth/mfa/verify` | Verify + enable MFA | Access token | No |
| GET | `/api/auth/sessions` | List active sessions | Access token | No |
| DELETE | `/api/auth/sessions/:sessionId` | Revoke session | Access token | No |
| POST | `/api/auth/logout` | Logout current session | Access token + CSRF | No |

### Error Handling Strategy

- `AppError` for operational errors with explicit status codes
- Centralized handlers:
  - `notFoundHandler`
  - `errorHandler`
- Async controllers wrapped using `asyncHandler`

### Testing Checklist

- [ ] Signup email creates user with hashed password
- [ ] Email OTP verifies user and clears OTP fields
- [ ] Phone OTP verifies user and clears OTP fields
- [ ] Login succeeds with valid credentials
- [ ] Login fails and increments failed attempts
- [ ] Lockout triggers after 5 failed attempts
- [ ] Refresh token rotates and old token is revoked
- [ ] Password reset invalidates all active sessions
- [ ] MFA setup + verify enables MFA and enforces on login
- [ ] Session listing/revocation works per authenticated user
- [ ] Audit trail captures success/failure events with metadata
- [ ] CSRF blocks refresh/logout without valid token

## User Management API

Base path: `/api/v1/users`

Authentication: Bearer JWT access token required for all endpoints in this section.

### Standard Response Format

Success:

```json
{
	"success": true,
	"message": "...",
	"data": {}
}
```

Validation error (`422`):

```json
{
	"message": "Validation failed",
	"details": {
		"errors": [
			{
				"field": "phone",
				"message": "phone must be valid E.164 format",
				"value": "12345"
			}
		]
	}
}
```

---

### Endpoint Reference

| Endpoint | Method | Auth Required | Request Body Schema | Validation Rules | Sample Success Response | Error Responses |
|---|---|---|---|---|---|---|
| `/api/v1/users/me` | GET | Yes | None | N/A | `200` `{ "success": true, "message": "Profile fetched", "data": { "_id": "...", "name": "Aarav", "email": "user@example.com", "phone": "+919876543210", "profileImageUrl": "...", "isDeleted": false, "createdAt": "...", "updatedAt": "..." } }` | `401` auth required, `404` user not found, `410` user deleted |
| `/api/v1/users/me` | PATCH | Yes | `{ "name"?: string, "phone"?: string }` | Whitelist only (`name`, `phone`), `name` 2–50 chars, `phone` E.164, forbidden fields (`role`, `email`, `password`, `passwordHash`) | `200` `{ "success": true, "message": "Profile updated", "data": { ... } }` | `400` forbidden/no allowed fields, `409` phone conflict, `422` validation failed, `401/404/410` |
| `/api/v1/users/me/photo` | POST (multipart/form-data) | Yes | form-data: `photo` file | `photo` required, type: `jpg/jpeg/png`, max size `5MB` | `200` `{ "success": true, "message": "Profile photo updated", "data": { "profileImageUrl": "https://...", "signedProfileImageUrl": "https://..." } }` | `400` file missing/size/type invalid, `502` storage unavailable, `401/404/410` |
| `/api/v1/users/me/password` | PATCH | Yes | `{ "currentPassword": string, "newPassword": string, "confirmPassword": string }` | required fields, `newPassword` min 8 + number + special char, `confirmPassword === newPassword`, current password must match | `200` `{ "success": true, "message": "Password updated successfully", "data": null }` | `400` weak/invalid payload, `401` current password invalid, `422` validation failed, `401/404/410` |
| `/api/v1/users/me/sessions` | GET | Yes | None | N/A (rate limited) | `200` `{ "success": true, "message": "Active sessions fetched", "data": [{ "id": "...", "device": "MacBook", "ipAddress": "203.0.113.5", "createdAt": "...", "lastActiveAt": "...", "isCurrent": true }] }` | `429` too many requests, `401/404/410` |
| `/api/v1/users/me/sessions/:id` | DELETE | Yes | None | `id` must be a valid session id (cuid/UUID) (rate limited) | `200` `{ "success": true, "message": "Session invalidated successfully", "data": null }` | `404` session not found, `422` invalid id, `429`, `401/404/410` |
| `/api/v1/users/me` | DELETE | Yes | None | N/A | `200` `{ "success": true, "message": "Account deleted", "data": null }` | `401` auth required, `404` user not found |

---

### OpenAPI (Swagger) Snippet

```yaml
openapi: 3.0.3
info:
	title: Manas360 User Management API
	version: 1.0.0
paths:
	/api/v1/users/me:
		get:
			security:
				- bearerAuth: []
			responses:
				'200':
					description: Profile fetched
		patch:
			security:
				- bearerAuth: []
			requestBody:
				required: true
				content:
					application/json:
						schema:
							type: object
							additionalProperties: false
							properties:
								name:
									type: string
									minLength: 2
									maxLength: 50
								phone:
									type: string
									pattern: '^\\+?[1-9]\\d{1,14}$'
			responses:
				'200':
					description: Profile updated
				'422':
					description: Validation failed
		delete:
			security:
				- bearerAuth: []
			responses:
				'200':
					description: Account soft deleted

	/api/v1/users/me/photo:
		post:
			security:
				- bearerAuth: []
			requestBody:
				required: true
				content:
					multipart/form-data:
						schema:
							type: object
							required: [photo]
							properties:
								photo:
									type: string
									format: binary
			responses:
				'200':
					description: Profile photo updated

	/api/v1/users/me/password:
		patch:
			security:
				- bearerAuth: []
			requestBody:
				required: true
				content:
					application/json:
						schema:
							type: object
							required: [currentPassword, newPassword, confirmPassword]
							properties:
								currentPassword:
									type: string
								newPassword:
									type: string
									minLength: 8
									pattern: '^(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$'
								confirmPassword:
									type: string
			responses:
				'200':
					description: Password updated
				'422':
					description: Validation failed

	/api/v1/users/me/sessions:
		get:
			security:
				- bearerAuth: []
			responses:
				'200':
					description: Active sessions fetched
				'429':
					description: Rate limited

	/api/v1/users/me/sessions/{id}:
		delete:
			security:
				- bearerAuth: []
			parameters:
				- in: path
					name: id
					required: true
					schema:
						type: string
			responses:
				'200':
					description: Session invalidated
				'422':
					description: Invalid UUID
				'404':
					description: Session not found

components:
	securitySchemes:
		bearerAuth:
			type: http
			scheme: bearer
			bearerFormat: JWT
```

---

### cURL Examples

```bash
# 1) Get profile
curl -X GET 'http://localhost:5000/api/v1/users/me' \
	-H 'Authorization: Bearer <ACCESS_TOKEN>'

# 2) Update profile
curl -X PATCH 'http://localhost:5000/api/v1/users/me' \
	-H 'Authorization: Bearer <ACCESS_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"name":"Aarav Sharma","phone":"+919876543210"}'

# 3) Upload profile photo
curl -X POST 'http://localhost:5000/api/v1/users/me/photo' \
	-H 'Authorization: Bearer <ACCESS_TOKEN>' \
	-F 'photo=@/absolute/path/avatar.png;type=image/png'

# 4) Change password
curl -X PATCH 'http://localhost:5000/api/v1/users/me/password' \
	-H 'Authorization: Bearer <ACCESS_TOKEN>' \
	-H 'Content-Type: application/json' \
	-d '{"currentPassword":"Old@1234","newPassword":"New@5678","confirmPassword":"New@5678"}'

# 5) List active sessions
curl -X GET 'http://localhost:5000/api/v1/users/me/sessions' \
	-H 'Authorization: Bearer <ACCESS_TOKEN>'

# 6) Delete a specific session
curl -X DELETE 'http://localhost:5000/api/v1/users/me/sessions/<SESSION_ID>' \
	-H 'Authorization: Bearer <ACCESS_TOKEN>'

# 7) Soft delete account
curl -X DELETE 'http://localhost:5000/api/v1/users/me' \
	-H 'Authorization: Bearer <ACCESS_TOKEN>'
```
