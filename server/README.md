# IAES Server

NestJS backend for IAES (Intelligent Adaptive Examination System).

## Tech Stack

- NestJS 11
- TypeScript
- PostgreSQL
- Prisma 7
- Passport JWT authentication

## Prerequisites

- Node.js v20.19.0 or later
- npm
- PostgreSQL database

## Environment Setup

Create `server/.env`.

```env
PORT=3002
DATABASE_URL="postgresql://user:password@localhost:5432/iaes_db"
JWT_SECRET="local-dev-jwt-secret-change-me-2026-iaes-64-characters-minimum"
```

Keep `DATABASE_URL` in quotes if the password contains special characters such as `!`, `@`, or `#`.

`JWT_SECRET` signs login tokens. Use a long private value for shared or production environments.

Generate a random secret with PowerShell:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

## Install Dependencies

From `server/`:

```bash
npm install
```

Or from the repository root:

```bash
npm install --prefix server
```

## Database Setup

This project uses **Prisma Migrate** (migration history under `prisma/migrations/`). Prefer `prisma migrate` over `db push` so migration history stays consistent across environments.

### Fresh Empty Database

```bash
npx prisma migrate deploy
npx prisma generate
npm run seed
```

`migrate deploy` applies all existing migrations in order. Then `generate` refreshes the typed Prisma client at `src/generated/prisma`. Finally `seed` populates demo data.

The seed script is idempotent (uses `upsert` / `skipDuplicates`) and can be re-run safely. It creates:

- 1 admin staff (`admin@iaes.local`)
- 1 instructor staff (`instructor@iaes.local`)
- 5 students (4 active, 1 inactive)
- 1 course (`IAES101`) + 1 course offering (year 2026 / semester 1)
- 2 knowledge categories linked to the course
- Enrollments for the 4 active students

Demo login accounts (password `1234`):

```text
Admin:      admin@iaes.local / 1234
Instructor: instructor@iaes.local / 1234
Student:    66131319 / 1234
```

### Existing Database With Data

If migrations are already applied and you only changed code or regenerated the client:

```bash
npx prisma generate
```

If new migration files were pulled from upstream:

```bash
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` only applies migrations that have not yet been recorded in the `_prisma_migrations` table. It will not destroy data.

### Creating A New Migration

When you change `prisma/schema.prisma` locally:

```bash
npx prisma migrate dev --name <short_descriptive_name>
```

This creates a new SQL file under `prisma/migrations/`, applies it to your local DB, and regenerates the client.

### Reset Local Development Database

⚠️ **Destructive — local dev only. This drops all data.**

```bash
npx prisma migrate reset
```

`migrate reset` drops the schema, re-applies every migration in order, then automatically runs the seed configured in `prisma.config.ts` (`tsx prisma/seed.ts`). If seed does not run automatically, run `npm run seed` after.

Never run `migrate reset` against a shared or production database.

## Run The Server

Development watch mode:

```bash
npm run start:dev
```

Production build:

```bash
npm run build
npm run start:prod
```

The backend runs on:

```text
http://localhost:3002
```

## Useful Commands

Generate Prisma client:

```bash
npx prisma generate
```

Apply pending migrations (existing DB):

```bash
npx prisma migrate deploy
```

Create a new migration after editing `schema.prisma`:

```bash
npx prisma migrate dev --name <short_descriptive_name>
```

Reset local DB (drops data, re-applies migrations, runs seed):

```bash
npx prisma migrate reset
```

Open Prisma Studio:

```bash
npx prisma studio
```

Run seed:

```bash
npm run seed
```

Run unit tests:

```bash
npm run test
```

Run e2e tests:

```bash
npm run test:e2e
```

Build:

```bash
npm run build
```

## Important Paths

```text
src/main.ts                  App bootstrap, global validation, CORS
src/app.module.ts            Root Nest module
src/auth/                    JWT auth, guards, strategies, login logic
src/modules/staff/           Staff CRUD
src/modules/students/        Student CRUD and student enrollments
src/modules/courses/         Course management
src/modules/course-offerings/ Course offerings, enrollments, CSV preview
src/modules/question-bank/   Question bank years, collections, questions
src/modules/course-exams/    Course exam management
src/prisma/                  Prisma service module
src/generated/prisma/        Generated Prisma client
prisma/schema.prisma         Database schema
prisma/seed.ts               Demo data seed
```

## Troubleshooting

### PowerShell Blocks npm

Use `npm.cmd` instead:

```powershell
npm.cmd run start:dev
```

### `permission denied for schema public`

The database user in `DATABASE_URL` needs create access on the target database and schema.

Connect as a database owner or superuser to the target database first, then run:

```sql
\c iaes_db

GRANT CREATE ON DATABASE iaes_db TO iaes;
GRANT USAGE, CREATE ON SCHEMA public TO iaes;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iaes;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iaes;
```

Verify:

```sql
SELECT
  has_database_privilege('iaes', 'iaes_db', 'CREATE') AS database_create,
  has_schema_privilege('iaes', 'public', 'CREATE') AS public_schema_create;
```

Both values must be `true`.

### Port Already In Use

If `3002` is already in use, stop the existing process or change `PORT` in `server/.env`.
