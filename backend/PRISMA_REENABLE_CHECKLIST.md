# Prisma Re-enable Checklist

This checklist tracks endpoints that currently return `501 Not Implemented` and the work required to re-enable them safely.

## 1) Therapist Profile & Verification

Affected endpoints:
- `POST /api/v1/therapists/profile`
- `GET /api/v1/therapists/me/profile`
- `POST /api/v1/therapists/me/documents`
- `PATCH /api/v1/admin/therapists/:id/verify`

Required work:
- [ ] Add Prisma models for therapist profile and therapist documents
- [ ] Add relations to `User` with explicit foreign keys and indexes
- [ ] Implement migration SQL and run `prisma migrate dev`
- [ ] Replace `501` guards in therapist/admin services with Prisma CRUD
- [ ] Add validation for profile/document payloads and verification transitions
- [ ] Add integration tests for create/get/upload/verify flows

## 2) Lead Marketplace

Affected endpoints:
- `GET /api/v1/therapists/me/leads`
- `POST /api/v1/therapists/me/leads/:id/purchase`

Required work:
- [ ] Add Prisma models for lead inventory and lead purchases
- [ ] Define ownership and purchase idempotency constraints
- [ ] Implement transactional purchase flow (`$transaction`) with balance checks
- [ ] Add audit logging for lead views and purchases
- [ ] Add tests for listing filters, purchase success, duplicate purchase, insufficient balance

## 3) Response-level Session Notes

Affected endpoints:
- `POST /api/v1/therapists/me/sessions/:id/responses/:responseId/notes`
- `GET /api/v1/therapists/me/sessions/:id/responses/:responseId/notes`
- `GET /api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId`
- `PUT /api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId`
- `DELETE /api/v1/therapists/me/sessions/:id/responses/:responseId/notes/:noteId`

Required work:
- [ ] Add Prisma model for response notes with relation to session response entity
- [ ] Implement encrypted note payload handling consistent with existing session-note behavior
- [ ] Enforce therapist ownership and soft-delete semantics
- [ ] Add tests for full CRUD lifecycle + authorization failures

## 4) Therapist Earnings

Affected endpoint:
- `GET /api/v1/therapists/me/earnings`

Required work:
- [ ] Confirm earnings source models in Prisma (session payout / settlement records)
- [ ] Implement aggregation query for period-based totals and breakdowns
- [ ] Add pagination/filters where needed
- [ ] Add tests for date ranges and empty-state responses

## 5) Documentation & Release Gates

- [ ] Remove migration warning blocks from docs once all endpoints are re-enabled
- [ ] Update therapist/admin API examples with final response payloads
- [ ] Run backend validation: `npm run prisma:generate && npm run typecheck`
- [ ] Run backend tests: `npm test`
- [ ] Confirm no remaining explicit migration `501` messages in services

## Suggested Validation Commands

```bash
cd backend
npm run prisma:generate
npm run typecheck
npm test
```
