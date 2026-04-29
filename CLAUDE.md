# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IAES (Intelligent Adaptive Examination System) is a web application for examination adaptive systems. It's a monorepo with a Next.js frontend and NestJS backend, using PostgreSQL with Prisma ORM.

## Repository Structure

```
IAES/
├── client/          # Next.js frontend (React 19, Tailwind CSS 4, TypeScript)
├── server/          # NestJS backend (TypeScript, Prisma, Passport JWT auth)
├── shared/          # Shared code between client and server
├── package.json     # Root scripts for running both concurrently
```

## Key Commands

### Root (run both concurrently)
```bash
npm install          # Install root dependencies (concurrently)
npm run dev          # Start both frontend and backend
npm run dev:client   # Start frontend only
npm run dev:server   # Start backend only
```

### Client (`client/`)
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Next.js 16)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Server (`server/`)
```bash
npm install          # Install dependencies
npm run start:dev    # Start with watch mode
npm run build        # Build with NestJS CLI
npm run test         # Run unit tests (Jest)
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run e2e tests
npm run lint         # Run ESLint with auto-fix
npm run seed         # Seed database (tsx prisma/seed.ts)
```

### Database (run from `server/`)
```bash
npx prisma migrate dev --name <name>   # Create and apply migration
npx prisma generate                     # Regenerate Prisma client
npx prisma studio                       # Open Prisma GUI
```

## Architecture

### Backend (NestJS)

The server follows a modular NestJS architecture. Modules wired in [server/src/app.module.ts](server/src/app.module.ts):

- **Auth Module** ([server/src/auth/](server/src/auth/)) - JWT-based authentication using Passport (strategies, guards, decorators, DTOs, types under this folder). Tokens expire in 1 day. Two user types: STAFF (with roles ADMIN/INSTRUCTOR) and STUDENT.
- **Staff Module** ([server/src/modules/staff/](server/src/modules/staff/)) - CRUD for staff users (instructors and admins).
- **Students Module** ([server/src/modules/students/](server/src/modules/students/)) - CRUD for students.
- **Courses Module** ([server/src/modules/courses/](server/src/modules/courses/)) - Course management with knowledge categories.
- **Course Offerings Module** ([server/src/modules/course-offerings/](server/src/modules/course-offerings/)) - Course offerings per academic year/semester, student enrollment, CSV bulk upload with preview.
- **Knowledge Categories Module** ([server/src/modules/knowledge-categories/](server/src/modules/knowledge-categories/)) - Categorization system linking courses and questions.
- **Question Bank Module** ([server/src/modules/question-bank/](server/src/modules/question-bank/)) - Question CRUD with choices and knowledge tagging. Exposes both `question-bank` and `questions` controllers/services.
- **Course Exams Module** ([server/src/modules/course-exams/](server/src/modules/course-exams/)) - Exam set creation/management bound to a course offering, including exam questions composition.
- **Prisma Module** ([server/src/prisma/](server/src/prisma/)) - Global Prisma service provider.
- **Shared lib** ([server/src/lib/](server/src/lib/)) - Cross-module helpers: `faculty-map.ts` (faculty/department lookup) and `prisma.ts`.

Key patterns:
- Controllers use `@Auth()` decorator for JWT protection
- `RolesGuard` enforces role-based access (ADMIN/INSTRUCTOR)
- DTOs use `class-validator` for validation
- Prisma client is generated to `server/src/generated/prisma`

### Frontend (Next.js App Router)

- Uses Next.js 16 App Router with React 19, Tailwind CSS 4, and the React Compiler (`babel-plugin-react-compiler`).
- **Middleware** ([client/src/middleware.ts](client/src/middleware.ts)) - Edge runtime middleware that checks auth cookies (`access_token`, `user`) and enforces role-based route access. Redirects unauthenticated users to `/login`, sends ADMIN to `/admin/manage-users` instead of `/`.
- **App routes** ([client/src/app/](client/src/app/)) - `login`, `register`, `forbidden`, `admin/manage-users`, `staff/login`, `course/[offeringId]`, `exam-bank`, `results`.
- **Auth** ([client/src/lib/auth.ts](client/src/lib/auth.ts)) - Client-side auth service storing tokens in both localStorage and cookies. Permission helpers in [client/src/lib/auth.permissions.ts](client/src/lib/auth.permissions.ts).
- **API** ([client/src/lib/api.ts](client/src/lib/api.ts)) - Axios instance with automatic Bearer token injection and 401 handling.
- **Feature-based organization** - Domain logic under [client/src/features/](client/src/features/) (`admin`, `auth`, `courseOffering`, `staff`, `student`); reusable UI under [client/src/components/](client/src/components/) (`course`, `courseOffering`, `exam`, `layout`, `questionBank`, `ui`).
- **Types & utils** - Shared TypeScript types in [client/src/types/](client/src/types/); helpers in [client/src/utils/](client/src/utils/).
- **Shared lib** - `faculty-map.ts` mirrors the server-side faculty/department mapping.

### Database Schema (Prisma)

Key models:
- `staff_users` - Staff accounts with role enum (INSTRUCTOR/ADMIN)
- `students` / `student_directory` - Student accounts and directory
- `courses` / `course_offerings` / `course_enrollments` / `course_instructors` - Course management
- `question_bank` / `question_choices` / `knowledge_categories` / `question_knowledge` / `course_knowledge` - Question bank with knowledge categorization
- `course_exams` / `exam_questions` / `exam_attempts` / `attempt_items` / `attempt_answers` - Exam and attempt tracking
- `import_preview_sessions` / `import_preview_rows` - Ephemeral tables for CSV import preview

## Environment Variables

**Server** (`server/.env`):
```
PORT=3002
DATABASE_URL=postgresql://user:password@localhost:5432/db_name
JWT_SECRET=secret123  # Change in production
```

**Client** (`client/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## Important Notes

- Prisma generates to a custom output path: `server/src/generated/prisma` (CJS module format)
- The backend runs on port 3002 by default
- Auth uses both localStorage (client-side API calls) and cookies (Next.js middleware)
- The `shared/` directory exists for code shared between client and server
- Exam system supports adaptive testing with IRT parameters (difficulty, discrimination, guessing)
- CSV bulk student enrollment uses a two-phase preview-then-commit pattern with auto-expiring preview sessions
