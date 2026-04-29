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
- Staff login route redirects to the unified login page: `/staff/login`
- Auth data is stored in both `localStorage` and cookies
- Middleware protects authenticated routes and checks role access
- Static public assets, such as `/IAES_logo.png`, are allowed through middleware

## Important Paths

```text
src/app/                 Next.js App Router pages
src/middleware.ts        Route protection and role access
src/lib/api.ts           Axios instance and API helpers
src/lib/auth.ts          Client auth storage helpers
src/components/          Shared UI and layout components
src/features/            Domain-specific API and UI modules
public/IAES_logo.png     Login/logo asset
```

## Troubleshooting

### Frontend Cannot Reach Backend

Check that the backend is running and `client/.env.local` points to the correct API URL.

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

Restart the frontend after changing `.env.local`.

### Logo or Public Asset Does Not Load

Public files live in `client/public/` and should be referenced from the root path:

```tsx
<Image src="/IAES_logo.png" alt="Logo" width={100} height={100} />
```

If a public file returns HTML instead of the asset, check `src/middleware.ts` and make sure static file paths are excluded from auth middleware.

### PowerShell Blocks npm

Use `npm.cmd` instead:

```powershell
npm.cmd run dev
```
