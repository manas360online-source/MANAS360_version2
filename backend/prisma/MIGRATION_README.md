# Migration: Add CBT Session Versioning

This migration adds the `cbt_session_versions` table and snapshot fields to `patient_sessions` so that templates can be versioned and sessions reference immutable snapshots.

Files:
- `prisma/migrations/20260227_add_versioning/migration.sql` - SQL migration to create table and add columns
- `scripts/apply_migration.sh` - Helper script to apply the SQL using `psql`
- `scripts/backfill_versions.ts` - Backfill script to create version rows for templates that lack them

Steps (recommended for staging):

1. Ensure `DATABASE_URL` is set to the target database.

2. Apply the migration:

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db"
bash backend/scripts/apply_migration.sh
```

3. Build backend and run backfill script to create version rows for existing templates:

```bash
cd backend
npm install --legacy-peer-deps   # if needed
npm run build
npm run backfill:versions
```

4. Verify migration:
   - `SELECT count(*) FROM cbt_session_versions;`
   - `SELECT template_version_id, count(*) FROM patient_sessions GROUP BY template_version_id;`

Rollback strategy:
- Because this migration is additive (creates new table/columns), rollback involves dropping the created columns and table. Always backup your DB before migrating.

Notes:
- The migration uses `gen_random_uuid()` to fill `id` defaults. If your Postgres does not have `pgcrypto` enabled, adjust the DDL accordingly.
- `scripts/backfill_versions.ts` will create initial version rows for templates that do not have versions; run it after applying the migration.
