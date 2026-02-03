import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware for Route Protection
 *
 * Why middleware instead of frontend guards?
 * 1. Runs on server BEFORE page renders - cannot be bypassed
 * 2. Works even with JavaScript disabled
 * 3. Single source of truth for authorization
 * 4. Better security - user never sees protected content
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get auth cookies
  const token = request.cookies.get("access_token")?.value;
  const userCookie = request.cookies.get("user")?.value;

  // If no auth, redirect to login
  if (!token || !userCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Parse user info
  let user: { type?: string; staff_role?: string } | null = null;
  try {
    user = JSON.parse(decodeURIComponent(userCookie));
  } catch {
    // Invalid user cookie, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Route protection rules
  // /course/* routes - INSTRUCTOR only (not ADMIN)
  if (pathname.startsWith("/course")) {
    const isInstructor =
      user?.type === "STAFF" && user?.staff_role === "INSTRUCTOR";

    if (!isInstructor) {
      // Redirect non-instructors to home
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Add more route protection rules here as needed
  // Example for future ADMIN routes:
  // if (pathname.startsWith('/admin')) {
  //   const isAdmin = user?.type === 'STAFF' && user?.staff_role === 'ADMIN';
  //   if (!isAdmin) return NextResponse.redirect(new URL('/', request.url));
  // }

  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    // Protect instructor-only routes
    "/course/:path*",
    // Add more protected routes here
    // '/admin/:path*',
  ],
};
