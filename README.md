# IAES

IAES (Intelligent Adaptive Examination System) is a web application for adaptive examination management. The repository is a monorepo with a Next.js frontend, a NestJS backend, PostgreSQL, and Prisma.

## Features

- Manage staff users, students, courses, course offerings, and enrollments
- Import students through CSV preview and confirm workflow
- Manage question banks, knowledge categories, exam sets, and attempts
- JWT authentication with httpOnly cookies
- Role-based access for ADMIN, INSTRUCTOR, and STUDENT users
- Audit logging for sensitive user and enrollment changes

## Tech Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4, TypeScript
- Backend: NestJS 11, Passport JWT, Prisma 7
- Database: PostgreSQL
- Authentication: httpOnly cookie JWT flow

## Prerequisites

- Node.js v20.19.0 or later
- npm
- PostgreSQL

## Quick Start

1. Install dependencies.

```bash
npm install
npm install --prefix server
npm install --prefix client
```

2. Create backend environment file at `server/.env`.

```env
PORT="3002"
DATABASE_URL="postgresql://user:password@localhost:5432/iaes_db"
JWT_SECRET="replace-this-with-a-random-secret-at-least-32-characters"
BCRYPT_COST="10"
```

`JWT_SECRET` must be at least 32 characters. Production refuses missing, short, or known placeholder secrets. `BCRYPT_COST` must be an integer from `10` to `31`.

Generate a random JWT secret with PowerShell:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

3. Create frontend environment file at `client/.env.local`.

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

4. Apply database migrations and generate the Prisma client.

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

5. Optional: seed demo data.

```bash
cd server
npm run seed
```

6. Run backend and frontend together from the repository root.

```bash
npm run dev
```

Open:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:3002
```

## Demo Accounts

The seed script creates these demo accounts with password `1234`:

```text
Admin:      admin@iaes.local / 1234
Instructor: instructor@iaes.local / 1234
Student:    66131319 / 1234
```

## Database Workflows

Run database commands from `server/`.

### Fresh Empty Database

```bash
npx prisma migrate deploy
npx prisma generate
npm run seed
```

### Existing Database After Pulling Latest Code

If new migration files were pulled:

```bash
npx prisma migrate deploy
npx prisma generate
```

If no schema or migration files changed:

```bash
npx prisma generate
```

### Create A New Migration

After editing `server/prisma/schema.prisma`:

```bash
npx prisma migrate dev --name <short_descriptive_name>
```

### Reset Local Development Database

Danger: this drops all local data.

```bash
npx prisma migrate reset
```

Never run `migrate reset` against shared or production databases.

## Security And Auth Notes

- Login endpoints are throttled at 5 attempts per minute for the configured `short` throttler.
- JWTs are set by the API in httpOnly `access_token` cookies.
- The frontend stores only non-sensitive user profile data in `localStorage`; it does not store the access token.
- Axios sends cookies with `withCredentials: true`.
- Next.js middleware reads `access_token` and `user` cookies to protect routes and enforce role access.
- Password changes update `password_changed_at`; older JWTs are rejected after a password change.
- Student API responses use explicit selects so `password_hash` is not returned by list/detail endpoints.
- Audit logs are written to `audit_logs` for sensitive user and enrollment actions.

## Useful Commands

Run both apps:

```bash
npm run dev
```

Run only the client:

```bash
npm run dev:client
```

Run only the server:

```bash
npm run dev:server
```

Build server:

```bash
npm run build --prefix server
```

Run server tests:

```bash
npm run test --prefix server -- --runInBand
```

Build client:

```bash
npm run build --prefix client
```

Open Prisma Studio:

```bash
cd server
npx prisma studio
```

Rehash existing plaintext or lower-cost passwords after changing `BCRYPT_COST`:

```bash
cd server
npm run rehash-passwords
```

## Troubleshooting

### PowerShell Blocks npm

Use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

### JWT_SECRET Boot Error

Set `JWT_SECRET` in `server/.env` to a value with at least 32 characters. In production, do not use example placeholders from documentation or `.env.example`.

### Frontend Cannot Stay Logged In

Check that:

- Backend is running on `NEXT_PUBLIC_API_URL`
- Backend CORS allows the frontend origin
- API requests use credentials
- Browser cookies for `localhost` are not blocked

### PostgreSQL Schema Permission Error

If `npx prisma migrate deploy` fails with `permission denied for schema public`, grant privileges from a database owner or superuser:

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
