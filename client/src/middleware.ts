import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  type ParsedUser,
  type ResolvedRole,
  getUserRole,
  isAllowed,
} from "@/lib/auth.permissions";

const FORBIDDEN_PATH = "/forbidden";
const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip public routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/staff/login") ||
    pathname.startsWith("/register") ||
    pathname === "/forbidden" ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Read auth cookies
  const token = request.cookies.get("access_token")?.value;
  const userCookie = request.cookies.get("user")?.value;

  // No auth → redirect to login
  if (!token || !userCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Parse user from cookie
  let user: ParsedUser | null = null;
  try {
    user = JSON.parse(decodeURIComponent(userCookie)) as ParsedUser;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role: ResolvedRole = getUserRole(user);

  // UX: ADMIN visiting "/" → redirect to admin dashboard
  if (pathname === "/" && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/manage-users", request.url));
  }

  if (!isAllowed(pathname, role)) {
    return NextResponse.rewrite(new URL(FORBIDDEN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\..*|login|staff/login|register|api|forbidden).*)",
  ],
};
