# Prisma Migration Workflow

This project uses SQL-first Prisma migrations under `prisma/migrations` and helper scripts in `scripts/`.

## Prerequisites

0. Initialize environment variables from template:

```bash
cd backend
cp .env.example .env
```

1. Set a valid database connection:

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db"
```

2. Ensure dependencies are installed in `backend/`.

## Generate an incremental migration

Generate SQL from current live DB state to current `prisma/schema.prisma`:

```bash
cd backend
./scripts/generate_incremental_migration.sh financial_core_cutover
```

This creates:

- `prisma/migrations/<YYYYMMDD>_financial_core_cutover/migration.sql`

## Apply a migration

Apply latest migration automatically:

```bash
cd backend
./scripts/apply_migration.sh
```

Apply a specific migration directory:

```bash
cd backend
./scripts/apply_migration.sh 20260301_financial_core_cutover
```

Apply a specific SQL file:

```bash
cd backend
./scripts/apply_migration.sh /absolute/path/to/migration.sql
```

## Validate Prisma schema/client

```bash
cd backend
npm run prisma:validate
npm run prisma:generate
```

## Notes

- `prisma/migrations/20260301_financial_core_cutover/migration.sql` is a full baseline (empty schema to current schema) and is suitable for bootstrapping fresh databases.
- For existing environments, prefer `generate_incremental_migration.sh` to avoid re-creating already-existing objects.
