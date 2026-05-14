# IAES

IAES (Intelligent Adaptive Examination System) is a web application for adaptive examination management. The repository is a monorepo with a Next.js frontend, a NestJS backend, PostgreSQL, and Prisma.

## Features

- Role-aware course home for instructors and students
- Manage staff users, students, courses, course offerings, and enrollments
- Admin user management supports role tabs plus faculty, curriculum, and student cohort filtering; student cohorts are derived from the first two digits of student codes.
- Import students through CSV preview and confirm workflow
- Manage course members, instructors, question banks, knowledge categories, exam sets, and attempts
- Import question bank data through CSV preview, row review/edit, and confirm workflow
- JWT authentication with httpOnly cookies
- Role-based access for ADMIN, INSTRUCTOR, and STUDENT users
- Shared navigation includes a profile menu with an initials-based avatar fallback for accounts without profile images.
- Custom 404 handling for mistyped routes, with role-aware navigation back to the correct home area.
- Audit logging for sensitive user and enrollment changes
- Results summary page is present as an in-progress report dashboard placeholder with role-aware navigation.

## Tech Stack

- Frontend: Next.js 16.0.10, React 19.2.1, Tailwind CSS 4, TypeScript
- Backend: NestJS 11, Passport JWT, Prisma 7.3.0
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

Run the `--prefix` commands only from the repository root. If your terminal is already in `server/` or `client/`, run plain `npm install` there instead.

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

The generated Prisma client lives at `server/src/generated/prisma`. It is gitignored and can be regenerated at any time.

5. Optional: seed demo data.

```bash
cd server
npm run seed
```

The seed is idempotent. It currently creates 2 admin accounts, 7 instructor accounts, 25 students, 13 courses, 12 course offerings, 20 knowledge categories, 10 question collections, 33 questions, 10 exam sets, and demo exam attempts.

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

Use the unified login page at `http://localhost:3000/login`. The form accepts either an 8-digit student code or a staff email.

## Main Routes

```text
/login                         Unified login page
/                              Role-aware course home
/admin/manage-users            Admin user management with role, faculty, curriculum, and student cohort filters
/course                        Instructor course catalog and course setup
/course/[offeringId]           Course dashboard
/course/[offeringId]/members   Course member and CSV enrollment management
/course/[offeringId]/exam/create
                               Open an exam from an existing exam set
/exam-bank                     Instructor course picker for question bank work
/exam-bank/[offeringId]        Question bank and exam set entry page
/exam-bank/[offeringId]/questions
/exam-bank/[offeringId]/questions/create
/exam-bank/[offeringId]/exam-sets
/exam-bank/[offeringId]/exam-sets/create
/exam-bank/[offeringId]/exam-sets/[examId]/edit
/results                       In-progress results summary dashboard
Invalid paths                  Custom 404 page with role-aware home/back actions
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

## Database Coverage

Important Prisma areas include:

- `audit_logs` for sensitive action history
- `staff_users`, `students`, and `student_directory` for account and profile data
- `courses`, `course_offerings`, `course_instructors`, and `course_enrollments` for course management
- `question_bank`, `question_choices`, `knowledge_categories`, `course_knowledge`, and `question_knowledge` for question authoring and tagging
- `question_bank_years` and `question_collections` for organizing question sets by academic year and collection
- `course_exams` and `exam_questions` for reusable exam sets
- `exam_attempts`, `attempt_items`, and `attempt_answers` for exam history and result data
- `import_preview_sessions` and `import_preview_rows` for student CSV enrollment preview
- `question_import_sessions` and `question_import_rows` for question bank CSV preview

## Security And Auth Notes

- Login endpoints are throttled at 5 attempts per minute for the configured `short` throttler.
- JWTs are set by the API in httpOnly `access_token` cookies.
- The frontend stores only non-sensitive user profile data in `localStorage`; it does not store the access token.
- Axios sends cookies with `withCredentials: true`.
- Next.js middleware reads `access_token` and `user` cookies to protect routes and enforce role access.
- ADMIN users can access admin pages. INSTRUCTOR users can access course management, course dashboards, course members, and exam bank pages. STUDENT users can access the role-aware home and enrolled course dashboards.
- Course exam management endpoints are staff-only; the course dashboard avoids calling them for students.
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

Lint client:

```bash
npm run lint --prefix client
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
npm.cmd run build --prefix client
```

Use the same `.cmd` form for `npx` if PowerShell blocks scripts:

```powershell
npx.cmd prisma generate
```

### Prisma Client Cannot Be Imported

If the server shows TypeScript errors such as:

```text
Cannot find module '../generated/prisma/client'
Property '$transaction' does not exist on type 'PrismaService'
Property 'students' does not exist on type 'PrismaService'
```

the generated Prisma client is missing or incomplete. From `server/`, stop the watch process and regenerate it:

```powershell
Remove-Item -LiteralPath .\src\generated\prisma -Recurse -Force
npx.cmd prisma generate
npm.cmd run build
```

If you accidentally ran `npm install --prefix server` while already inside `server/`, remove the accidental nested folder from the repository root:

```powershell
Remove-Item -LiteralPath .\server\server -Recurse -Force
```

Then run the correct install command for your current directory.

### JWT_SECRET Boot Error

Set `JWT_SECRET` in `server/.env` to a value with at least 32 characters. In production, do not use example placeholders from documentation or `.env.example`.

### Frontend Cannot Stay Logged In

Check that:

- Backend is running on `NEXT_PUBLIC_API_URL`
- Backend CORS allows the frontend origin
- API requests use credentials
- Browser cookies for `localhost` are not blocked

### Next.js Build Warnings

Next.js 16 may warn that the `middleware` file convention is deprecated in favor of `proxy`, and `baseline-browser-mapping` may warn when its browser baseline data is older than two months. These warnings do not block the current build.

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
