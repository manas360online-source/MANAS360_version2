Therapist & Patient Socket Demo

Routes:
- Patient demo: /#/session-demo?sessionId=<id>
- Therapist dashboard: /#/therapist-dashboard?sessionId=<id>

Usage:
- Ensure backend `REDIS_URL` and JWT secrets are configured when running full system.
- Tokens: the demo reads `accessToken` from `localStorage` (set in browser devtools).

Notes:
- Therapist dashboard shows leader tabId; only the leader tab maintains the socket connection to avoid duplicate event processing across multiple open tabs.
- Tests: run `npm run test` in `frontend` to execute unit tests.

