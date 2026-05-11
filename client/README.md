# IAES Client

Next.js frontend for IAES (Intelligent Adaptive Examination System).

## Tech Stack

- Next.js 16.0.10
- React 19.2.1
- TypeScript
- Tailwind CSS 4
- Axios
- Lucide React

## Prerequisites

- Node.js v20.19.0 or later
- npm
- IAES backend running on `http://localhost:3002`

## Environment Setup

Create `client/.env.local`.

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

`NEXT_PUBLIC_API_URL` must point to the NestJS backend.

## Install Dependencies

From `client/`:

```bash
npm install
```

Or from the repository root:

```bash
npm install --prefix client
```

Use `--prefix client` only from the repository root. If your terminal is already in `client/`, use plain `npm install`.

## Run Development Server

From `client/`:

```bash
npm run dev
```

Or from the repository root:

```bash
npm run dev:client
```

Open:

```text
http://localhost:3000
```

## Build and Start Production Bundle

```bash
npm run build
npm run start
```

## Lint

```bash
npm run lint
```

## Auth and Routing Notes

- Login page: `/login`
- Staff login route redirects through the unified login page: `/staff/login`
- The unified login form accepts either an 8-digit student code or a staff email.
- The API sets JWTs in httpOnly cookies; the frontend does not store access tokens in `localStorage`.
- `client/src/lib/auth.ts` stores only non-sensitive user profile data for UI rendering.
- `client/src/lib/api.ts` uses Axios with `withCredentials: true` so cookies are sent to the backend.
- `clearAuth()` calls `POST /auth/logout` and clears legacy client-written cookies.
- Middleware protects authenticated routes and checks role access from the auth cookies.
- ADMIN users visiting `/` are redirected to `/admin/manage-users`.
- INSTRUCTOR users can access `/course`, `/course/[offeringId]`, course members, and `/exam-bank`.
- STUDENT users can access `/` and enrolled course detail pages under `/course/[offeringId]`.
- Static public assets, such as `/IAES_logo.png`, are allowed through middleware.

## Current App Routes

```text
src/app/page.tsx                              Role-aware course home
src/app/login/page.tsx                        Unified login page
src/app/staff/login/page.tsx                  Redirect to /login
src/app/admin/manage-users/page.tsx           Admin staff/student management with cohort filtering
src/app/course/page.tsx                       Instructor course catalog
src/app/course/[offeringId]/page.tsx          Course dashboard
src/app/course/[offeringId]/members/page.tsx  Course members and CSV import
src/app/course/[offeringId]/exam/create       Open an exam from an exam set
src/app/exam-bank/page.tsx                    Course picker for exam bank
src/app/exam-bank/[offeringId]/page.tsx       Exam bank entry page
src/app/exam-bank/[offeringId]/questions      Question bank list/create/edit flow
src/app/exam-bank/[offeringId]/exam-sets      Exam set list/create/edit flow
src/app/results/page.tsx                      Results summary placeholder
```

## Important Paths

```text
src/app/                 Next.js App Router pages
src/middleware.ts        Route protection and role access
src/lib/api.ts           Axios instance and API helpers
src/lib/auth.ts          Client auth profile helpers
src/lib/auth.permissions.ts Permission helpers
src/components/          Shared UI and layout components
src/features/            Domain-specific API and UI modules
src/types/               Shared frontend TypeScript types
src/config/curriculums.ts Curriculum definitions
public/IAES_logo.png     Login/logo asset
```

## UI Notes

- The app uses a purple IAES theme centered around `#B7A3E3`, `#7C5BD9`, and `#F4EFFF`.
- `src/components/layout/NavBar.tsx` owns the shared sidebar, top navigation, and profile dropdown used across authenticated pages.
- The top-right profile menu uses an initials-based avatar fallback, so it works even when accounts do not have profile images.
- Admin user management uses role tabs and client-side filters for faculty, curriculum, and student cohort. Student cohort options are generated from the first two digits of loaded student codes.
- Course cards are shown in three columns on wide screens and collapse responsively.
- Course dashboards fetch exam management data only for staff users with exam-management access.
- The sidebar keeps "ผลสรุปการสอบ" as the final menu item.
- `/results` intentionally shows a "กำลังพัฒนา" state until the summary feature is implemented.

## Verification

Run from `client/`:

```bash
npm run build
npm run lint
```

Or from the repository root:

```bash
npm run build --prefix client
npm run lint --prefix client
```

## Troubleshooting

### Frontend Cannot Reach Backend

Check that the backend is running and `client/.env.local` points to the correct API URL.

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

Restart the frontend after changing `.env.local`.

### Login Succeeds But Routes Redirect Back To Login

Check that:

- Backend CORS allows the frontend origin
- Browser cookies for `localhost` are not blocked
- Requests are sent to the same backend URL configured in `NEXT_PUBLIC_API_URL`
- API requests use `withCredentials: true`

### Logo or Public Asset Does Not Load

Public files live in `client/public/` and should be referenced from the root path:

```tsx
<Image src="/IAES_logo.png" alt="Logo" width={100} height={100} />
```

If a public file returns HTML instead of the asset, check `src/middleware.ts` and make sure static file paths are excluded from auth middleware.

### PowerShell Blocks npm

Use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

### Next.js Workspace Root Warning

`next build` may warn that it detected multiple lockfiles and inferred the workspace root from the repository root. This is non-blocking. Keep running client commands from `client/`, or from the repository root with `--prefix client`.

### Middleware Deprecation Warning

Next.js 16 may warn that the `middleware` file convention is deprecated in favor of `proxy`. This is a framework migration warning; it does not block the current build.
