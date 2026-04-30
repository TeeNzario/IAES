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

Choose the workflow that matches your database state.

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

Push the Prisma schema, generate the Prisma client, and insert demo data:

```bash
cd server
npx prisma db push
npx prisma generate
npm run seed
```

The seed is safe to run more than once. It creates demo staff users, demo students, one course, one course offering, and enrollments.

Demo login accounts:

```text
Admin:      admin@iaes.local / 1234
Instructor: instructor@iaes.local / 1234
Student:    66131319 / 1234
```

### Option B: Database Already Has Schema and Data

Use this when the database already has IAES tables and existing data.

```bash
cd server
npx prisma generate
```

Then run the app. Do not run `npx prisma db push --force-reset` because it will reset data. Run `npm run seed` only if you intentionally want the demo accounts/data inserted or refreshed.

### Option C: Schema Changed After Pulling New Code

Use this when `server/prisma/schema.prisma` changed and the database must be updated.

```bash
cd server
npx prisma db push
npx prisma generate
```

For a shared or production-like database, back up the database first and read any Prisma warning before continuing. Do not use `--force-reset` on a database with important data.

### Option D: Reset Local Development Database

Use this only for a local throwaway database.

```bash
cd server
npx prisma db push --force-reset
npm run seed
```

This resets the schema and data, then recreates the demo data.

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

If `npx prisma db push` fails with `permission denied for schema public`, the PostgreSQL user in `DATABASE_URL` does not have schema privileges. Ask a database owner or superuser to connect to the target database first, then grant access:

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
