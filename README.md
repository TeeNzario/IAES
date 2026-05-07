# IAES

IAES (Intelligent Adaptive Examination System) is a web application for adaptive examination management.

## Features

- Create and manage courses
- Create and manage students
- Create and manage staff users
- Create course offerings and enroll students
- Create exams and question banks

## Tech Stack

- Frontend: Next.js
- Backend: NestJS
- Database: PostgreSQL
- ORM: Prisma
- Authentication: Passport JWT

## Prerequisites

- Node.js v20.19.0 or later
- npm
- PostgreSQL

## Install Dependencies

Install dependencies for the root workspace, backend, and frontend.

```bash
npm install

cd server
npm install

cd ../client
npm install
```

## Environment Files

### Backend

Create `server/.env`.

```env
PORT=3002
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/iaes_db"
JWT_SECRET="local-dev-jwt-secret-change-me-2026-iaes-64-characters-minimum"
```

Change `postgres`, `your_password`, and `iaes_db` to match your PostgreSQL setup. Keep the `DATABASE_URL` in quotes if your password contains special characters such as `!`, `@`, or `#`.

`JWT_SECRET` is used to sign login tokens. For production, replace the example with a long random value and keep it private.

Generate a random secret with PowerShell:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

### Frontend

Create `client/.env.local`.

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## Database Setup Options

This project uses **Prisma Migrate** (migration history under `server/prisma/migrations/`). Prefer `prisma migrate` over `db push` so migration history stays consistent across environments. Choose the workflow that matches your database state.

### Option A: Fresh Empty Database

Use this when the database exists but has no IAES tables/data yet.

Create a database if needed:

```bash
createdb iaes_db
```

Or with `psql`:

```bash
psql -U postgres -c "CREATE DATABASE iaes_db;"
```

Apply all migrations, generate the Prisma client, and insert demo data:

```bash
cd server
npx prisma migrate deploy
npx prisma generate
npm run seed
```

The seed is idempotent (uses `upsert` / `skipDuplicates`) and can be re-run safely. It creates:

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

### Option B: Database Already Has Schema and Data

Use this when migrations are already applied and you only need to refresh the typed Prisma client (e.g. after pulling code with no schema change):

```bash
cd server
npx prisma generate
```

Do not run the seed unless you intentionally want demo accounts/data inserted or refreshed.

### Option C: New Migrations Pulled From Upstream

Use this when `git pull` brought new files under `server/prisma/migrations/` but no schema-only edits.

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` only applies migrations that have not yet been recorded in the `_prisma_migrations` table — it never destroys data.

For a shared or production-like database, back up the database first.

### Option D: You Edited `schema.prisma` Locally

When you change `server/prisma/schema.prisma` and need a new migration:

```bash
cd server
npx prisma migrate dev --name <short_descriptive_name>
```

This creates a new SQL file under `prisma/migrations/`, applies it to your local DB, and regenerates the client.

### Option E: Reset Local Development Database

Use this only for a local throwaway database. **Destructive — drops all data.**

```bash
cd server
npx prisma migrate reset
```

`migrate reset` drops the schema, re-applies every migration in order, then automatically runs the seed configured in `prisma.config.ts` (`tsx prisma/seed.ts`). Never run this against a shared or production database.

## Run The Project

### Run Backend and Frontend Together

From the repository root:

```bash
npm run dev
```

The app will be available at:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:3002
```

### Run Frontend Only

From the repository root:

```bash
npm run dev:client
```

Or from `client/`:

```bash
cd client
npm run dev
```

### Run Backend Only

From the repository root:

```bash
npm run dev:server
```

Or from `server/`:

```bash
cd server
npm run start:dev
```

## Useful Commands

Generate Prisma client:

```bash
cd server
npx prisma generate
```

Apply pending migrations (existing DB):

```bash
cd server
npx prisma migrate deploy
```

Create a new migration after editing `schema.prisma`:

```bash
cd server
npx prisma migrate dev --name <short_descriptive_name>
```

Reset local DB (drops data, re-applies migrations, runs seed):

```bash
cd server
npx prisma migrate reset
```

Open Prisma Studio:

```bash
cd server
npx prisma studio
```

Run backend tests:

```bash
cd server
npm run test
```

Build backend:

```bash
cd server
npm run build
```

Build frontend:

```bash
cd client
npm run build
```

## Troubleshooting

### PowerShell Blocks npm

If PowerShell blocks `npm` with an execution policy error, use `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev
```

### PostgreSQL Schema Permission Error

If `npx prisma migrate deploy` fails with `permission denied for schema public`, the PostgreSQL user in `DATABASE_URL` does not have schema privileges. Ask a database owner or superuser to connect to the target database first, then grant access:

```sql
\c iaes_db

GRANT CREATE ON DATABASE iaes_db TO iaes;
GRANT USAGE, CREATE ON SCHEMA public TO iaes;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iaes;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iaes;
```

Confirm privileges from the application user:

```sql
SELECT
  has_database_privilege('iaes', 'iaes_db', 'CREATE') AS database_create,
  has_schema_privilege('iaes', 'public', 'CREATE') AS public_schema_create;
```

Both values must be `true`.
