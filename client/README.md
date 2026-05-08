# IAES Client

Next.js frontend for IAES (Intelligent Adaptive Examination System).

## Tech Stack

- Next.js 16
- React 19
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
- The API sets JWTs in httpOnly cookies; the frontend does not store access tokens in `localStorage`.
- `client/src/lib/auth.ts` stores only non-sensitive user profile data for UI rendering.
- `client/src/lib/api.ts` uses Axios with `withCredentials: true` so cookies are sent to the backend.
- `clearAuth()` calls `POST /auth/logout` and clears legacy client-written cookies.
- Middleware protects authenticated routes and checks role access from the auth cookies.
- ADMIN users visiting `/` are redirected to `/admin/manage-users`.
- Static public assets, such as `/IAES_logo.png`, are allowed through middleware.

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
npm.cmd run dev
```
