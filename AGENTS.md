# AGENTS.md

This file provides guidance to Codex when working with this repository.

## Project Overview

IAES (Intelligent Adaptive Examination System) is a monorepo for adaptive examination management. It has a Next.js frontend, a NestJS backend, PostgreSQL, and Prisma ORM.

## Repository Structure

```text
IAES/
|-- client/       Next.js frontend (React 19, Tailwind CSS 4, TypeScript)
|-- server/       NestJS backend (TypeScript, Prisma, Passport JWT auth)
|-- shared/       Shared code between client and server
|-- package.json  Root scripts for running both apps concurrently
```

## Key Commands

### Root

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
npm run dev:client
npm run dev:server
```

Use `--prefix` only from the repository root. From inside `server/` or `client/`, run plain `npm install`, `npm run build`, and similar local scripts. On Windows PowerShell, use `npm.cmd` or `npx.cmd` if script execution is blocked.

### Client

```bash
cd client
npm install
npm run dev
npm run build
npm run start
npm run lint
```

### Server

```bash
cd server
npm install
npm run start:dev
npm run build
npm run test -- --runInBand
npm run test:e2e
npm run lint
npm run seed
npm run rehash-passwords
```

### Database

Run Prisma commands from `server/`.

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma migrate dev --name <name>
npx prisma migrate reset
npx prisma studio
```

Prefer Prisma Migrate over `db push`. Use `migrate reset` only for local throwaway databases because it drops data.

## Environment Variables

### Server

Create `server/.env`.

```env
PORT="3002"
DATABASE_URL="postgresql://user:password@localhost:5432/iaes_db"
JWT_SECRET="replace-this-with-a-random-secret-at-least-32-characters"
BCRYPT_COST="10"
```

Rules:

- `JWT_SECRET` must be at least 32 characters.
- Production refuses missing, short, or known placeholder JWT secrets.
- `BCRYPT_COST` must be an integer from `10` to `31`.

### Client

Create `client/.env.local`.

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## Architecture

### Backend

The server is a modular NestJS application.

- `server/src/auth/` - JWT login, guards, roles, strategy, cookie auth, JWT secret validation
- `server/src/modules/audit/` - audit logging into `audit_logs`
- `server/src/modules/staff/` - staff CRUD and password changes
- `server/src/modules/students/` - student CRUD and password changes
- `server/src/modules/courses/` - course management
- `server/src/modules/course-offerings/` - course offerings, enrollments, CSV preview/import
- `server/src/modules/knowledge-categories/` - knowledge category links
- `server/src/modules/question-bank/` - question bank, choices, knowledge tagging
- `server/src/modules/course-exams/` - exam set creation and management
- `server/src/prisma/` - global Prisma service provider
- `server/src/lib/password.ts` - bcrypt hashing, verification, and `BCRYPT_COST`

Key backend patterns:

- Controllers use the `@Auth()` decorator for protected routes.
- `RolesGuard` enforces ADMIN and INSTRUCTOR access.
- Login routes use `@nestjs/throttler` with a 5 attempts per minute limit.
- JWTs are accepted from Bearer tokens or the httpOnly `access_token` cookie.
- Password changes update `password_changed_at`; tokens issued before that timestamp are rejected.
- Sensitive changes write audit records through `AuditService`.
- Student list/detail responses must keep using explicit selects that exclude `password_hash`.

### Frontend

- Uses Next.js 16 App Router, React 19, Tailwind CSS 4, and TypeScript.
- `client/src/middleware.ts` reads `access_token` and `user` cookies for route protection and role access.
- `client/src/lib/api.ts` creates an Axios instance with `withCredentials: true`.
- `client/src/lib/auth.ts` stores only non-sensitive user profile data in `localStorage`; it does not store JWTs.
- Feature code lives under `client/src/features/`.
- Shared UI lives under `client/src/components/`.
- Shared frontend types live under `client/src/types/`.

## Database Schema Notes

Important Prisma models include:

- `audit_logs` - audit trail for sensitive actions
- `staff_users` - staff accounts with ADMIN or INSTRUCTOR role
- `students` and `student_directory` - student auth records and directory records
- `courses`, `course_offerings`, `course_enrollments`, `course_instructors` - course management
- `question_bank`, `question_choices`, `knowledge_categories`, `question_knowledge`, `course_knowledge` - question bank and tagging
- `course_exams`, `exam_questions`, `exam_attempts`, `attempt_items`, `attempt_answers` - exam and attempt tracking
- `import_preview_sessions`, `import_preview_rows` - CSV import preview workflow

`staff_users` and `students` include `password_changed_at` to invalidate old JWTs after password changes.

Curriculum IDs are defined in `client/src/config/curriculums.ts`. When inserting staff or students, code paths must supply `title`, `curriculumId`, and `facultyCode`; service layers provide defaults where DTOs omit allowed values.

## Setup Flow After Pulling Latest `master`

From the repository root:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

Then from `server/`:

```bash
npx prisma migrate deploy
npx prisma generate
```

Return to the repository root to start both apps:

```bash
npm run dev
```

Run verification before handing off larger changes:

```bash
npm run build --prefix server
npm run test --prefix server -- --runInBand
npm run build --prefix client
```

## Important Notes

- Prisma client output is `server/src/generated/prisma` with CJS module format.
- Backend default port is `3002`.
- Frontend default port is `3000`.
- Auth token storage is cookie-based. Do not reintroduce access tokens in `localStorage`.
- Keep `.env` and `.env.local` out of commits.
- The CSV bulk enrollment flow uses preview, edit/delete rows, and confirm.
- Generated Prisma client (`server/src/generated/prisma`) is gitignored. It is regenerated by `server`'s `postinstall` hook and by `npx prisma generate`.
- If TypeScript cannot import `src/generated/prisma/client` or `PrismaService` appears to have no model delegates, remove `server/src/generated/prisma` and run `npx prisma generate` from `server/`.
- If a nested `server/server/` directory appears, it usually came from running `npm install --prefix server` while already inside `server/`; remove that nested directory and run plain `npm install` from `server/`.
