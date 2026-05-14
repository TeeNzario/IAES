# IAES Server

NestJS backend for IAES (Intelligent Adaptive Examination System).

## Tech Stack

- NestJS 11
- TypeScript
- PostgreSQL
- Prisma 7.3.0
- Passport JWT authentication
- NestJS Throttler

## Prerequisites

- Node.js v20.19.0 or later
- npm
- PostgreSQL database

## Environment Setup

Create `server/.env`.

```env
PORT="3002"
DATABASE_URL="postgresql://user:password@localhost:5432/iaes_db"
JWT_SECRET="replace-this-with-a-random-secret-at-least-32-characters"
BCRYPT_COST="10"
```

Keep `DATABASE_URL` in quotes if the password contains special characters such as `!`, `@`, or `#`.

`JWT_SECRET` signs login tokens. It must be at least 32 characters. Production refuses missing, short, or known placeholder values.

Generate a random secret with PowerShell:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

`BCRYPT_COST` controls password hash cost. Valid values are integers from `10` to `31`; the default is `10`.

## Install Dependencies

From `server/`:

```bash
npm install
```

Or from the repository root:

```bash
npm install --prefix server
```

Use `--prefix server` only from the repository root. If your terminal is already in `server/`, use plain `npm install`.

## Database Setup

This project uses Prisma Migrate. Migration history lives under `server/prisma/migrations/`.

### Fresh Empty Database

```bash
npx prisma migrate deploy
npx prisma generate
npm run seed
```

The Prisma client is generated to `src/generated/prisma`.

`src/generated/prisma` is gitignored and generated locally. The server `postinstall` script also runs `prisma generate`.

The seed script is idempotent and creates:

- 2 admin staff accounts
- 7 instructor staff accounts, including one inactive instructor
- 25 students, including inactive demo students
- 13 courses and 12 course offerings
- 20 knowledge categories mapped across courses
- 10 question collections and 33 seeded questions
- 10 exam sets with linked exam questions
- Demo exam attempts and answers for result/history data

Demo login accounts use password `1234`:

```text
Admin:      admin@iaes.local / 1234
Instructor: instructor@iaes.local / 1234
Student:    66131319 / 1234
```

### Existing Database With New Migrations

After pulling new files under `prisma/migrations/`:

```bash
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` only applies migrations not yet recorded in `_prisma_migrations`. It does not destroy data.

### Existing Database With Code-Only Changes

If migrations are already applied and only code changed:

```bash
npx prisma generate
```

### Creating A New Migration

After editing `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name <short_descriptive_name>
```

This creates a SQL migration, applies it locally, and regenerates the Prisma client.

### Reset Local Development Database

Danger: this drops all local data.

```bash
npx prisma migrate reset
```

`migrate reset` reapplies all migrations and runs the seed configured in `prisma.config.ts`.

Never run this against a shared or production database.

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

## Auth And Security Flow

- `POST /auth/login`, `POST /auth/student/login`, and `POST /auth/staff/login` are throttled to 5 attempts per minute by the `short` throttler.
- `POST /auth/login` is the unified login endpoint and accepts either an 8-digit student code or a staff email through `identifier`.
- Successful login sets httpOnly cookies: `access_token` and `user`.
- JWT extraction supports both Bearer tokens and the `access_token` cookie.
- `JWT_SECRET` validation happens during boot through `src/auth/jwt-secret.ts`.
- Password changes update `password_changed_at` for staff and students.
- JWT validation rejects tokens issued before the latest password change.
- `BCRYPT_COST` is read from environment by `src/lib/password.ts`.
- `@Auth()` protects authenticated routes. `@Roles('INSTRUCTOR')` and `@Roles('ADMIN')` apply to staff-only routes.
- Course exam management under `course-offerings/:offeringId/exams` is limited to INSTRUCTOR and ADMIN staff.
- Sensitive actions are recorded through `AuditService` into the `audit_logs` table.
- Student list/detail service methods use explicit selects that exclude `password_hash`.

## Student API Notes

- `GET /students` is ADMIN-only and returns public student profile fields such as `student_code`, `email`, `facultyCode`, `title`, `curriculumId`, `first_name`, `last_name`, and `is_active`.
- The admin user management page derives student cohort filters on the frontend from the first two digits of `student_code`; no extra backend query parameter is required for that filter.

## Question Bank API Notes

- Question bank organization is scoped by course offering under `course-offerings/:offeringId/question-bank`.
- Years and collections are managed through `question_bank_years` and `question_collections`.
- Questions can be listed, created in bulk, updated, deleted, and tagged with knowledge categories.
- CSV question import uses `course-offerings/:offeringId/question-bank/import/preview`, preview row edit/delete endpoints, and `confirm/:sessionId`.
- Question import preview state is stored in `question_import_sessions` and `question_import_rows`; confirmed rows are converted into question bank records and the session is removed.

## Useful Commands

Generate Prisma client:

```bash
npx prisma generate
```

Apply pending migrations:

```bash
npx prisma migrate deploy
```

Create a migration:

```bash
npx prisma migrate dev --name <short_descriptive_name>
```

Open Prisma Studio:

```bash
npx prisma studio
```

Run seed:

```bash
npm run seed
```

Rehash existing plaintext or lower-cost passwords after changing `BCRYPT_COST`:

```bash
npm run rehash-passwords
```

Run unit tests:

```bash
npm run test -- --runInBand
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
src/main.ts                   App bootstrap, validation, CORS
src/app.module.ts             Root Nest module
src/auth/                     JWT auth, guards, strategy, login logic
src/auth/jwt-secret.ts        JWT_SECRET validation
src/lib/password.ts           bcrypt hashing and verification
src/modules/audit/            Audit logging module
src/modules/staff/            Staff CRUD and password changes
src/modules/students/         Student CRUD and password changes
src/modules/courses/          Course management
src/modules/course-offerings/ Course offerings, enrollments, CSV preview
src/modules/knowledge-categories/ Knowledge category lookup and links
src/modules/question-bank/    Question bank years, collections, choices, tags, CSV import preview
src/modules/course-exams/     Course exam set management
src/prisma/                   Prisma service module
src/generated/prisma/         Generated Prisma client
prisma/schema.prisma          Database schema
prisma/migrations/            Database migrations
prisma/seed.ts                Demo data seed entrypoint
prisma/seed/                  Idempotent modular seed data
prisma/rehash-passwords.ts    Password rehash utility
```

## Troubleshooting

### PowerShell Blocks npm

Use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run start:dev
```

Use `npx.cmd` if Prisma commands are blocked:

```powershell
npx.cmd prisma generate
```

### Prisma Client Cannot Be Imported

If TypeScript reports errors such as:

```text
Cannot find module '../generated/prisma/client'
Cannot find module '../../src/generated/prisma/client'
Property '$transaction' does not exist on type 'PrismaService'
Property 'students' does not exist on type 'PrismaService'
```

the generated Prisma client is missing or incomplete. Stop the running watch process, then run from `server/`:

```powershell
Remove-Item -LiteralPath .\src\generated\prisma -Recurse -Force
npx.cmd prisma generate
npm.cmd run build
```

If `prisma generate` fails with:

```text
src\generated\prisma exists and is not empty but doesn't look like a generated Prisma Client
```

remove `src/generated/prisma` and generate again with the commands above.

If a nested `server/server/` directory appears, it usually means `npm install --prefix server` was run while the terminal was already inside `server/`. Remove the nested folder from `server/`:

```powershell
Remove-Item -LiteralPath .\server -Recurse -Force
```

Then run `npm install` from `server/`, or return to the repository root before using `npm install --prefix server`.

### JWT_SECRET Boot Error

Set `JWT_SECRET` in `server/.env`. It must be at least 32 characters. In production, replace all example placeholders with a unique random secret.

### Invalid BCRYPT_COST

Set `BCRYPT_COST` to an integer from `10` to `31`.

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

Stop the existing process or change `PORT` in `server/.env`.
