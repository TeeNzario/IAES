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

### Fresh Empty Database

Use `prisma db push` for local development.

```bash
npx prisma db push
npx prisma generate
npm run seed
```

The seed script is idempotent and can be run more than once. It creates demo staff users, demo students, one course, one course offering, and enrollments.

Demo login accounts:

```text
Admin:      admin@iaes.local / 1234
Instructor: instructor@iaes.local / 1234
Student:    66131319 / 1234
```

### Existing Database With Data

If schema and data already exist, do not reset the database.

```bash
npx prisma generate
```

Run `npx prisma db push` only when `prisma/schema.prisma` changes and the database must be updated. Do not use `--force-reset` on a database with important data.

### Reset Local Development Database

Use this only for a local throwaway database.

```bash
npx prisma db push --force-reset
npm run seed
```

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
