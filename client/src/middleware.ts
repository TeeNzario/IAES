import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================================
// Role & Permission logic (self-contained for Edge Runtime)
// ============================================================

type Role = "ADMIN" | "INSTRUCTOR";
type ResolvedRole = Role | null;

interface ParsedUser {
  type?: string;
  staff_role?: string;
  role?: string;
}

interface RouteRule {
  path?: string;
  prefix?: string;
  allowedRoles: Role[];
  allowNoRole?: boolean;
}

function getUserRole(user: ParsedUser | null): ResolvedRole {
  if (!user) return null;
  if (user.type === "STAFF") {
    const role = user.staff_role ?? user.role;
    if (role === "ADMIN" || role === "INSTRUCTOR") return role;
    return null;
  }
  return null;
}

const ROUTE_RULES: RouteRule[] = [
  // /admin — ADMIN only
  { prefix: "/admin", allowedRoles: ["ADMIN"] },
  // / (home) — INSTRUCTOR + students, block ADMIN
  { path: "/", allowedRoles: ["INSTRUCTOR"], allowNoRole: true },
  // /course (exact list page) — INSTRUCTOR only
  { path: "/course", allowedRoles: ["INSTRUCTOR"] },
  // /course/[offeringId] and children — INSTRUCTOR + students
  { prefix: "/course/", allowedRoles: ["INSTRUCTOR"], allowNoRole: true },
];

function isAllowed(pathname: string, role: ResolvedRole): boolean {
  for (const rule of ROUTE_RULES) {
    const matchesExact = rule.path !== undefined && pathname === rule.path;
    const matchesPrefix =
      rule.prefix !== undefined && pathname.startsWith(rule.prefix);

    if (!matchesExact && !matchesPrefix) continue;

    if (role !== null && rule.allowedRoles.includes(role)) return true;
    if (role === null && rule.allowNoRole) return true;
    return false;
  }
  return true;
}

const FORBIDDEN_PATH = "/forbidden";
const PUBLIC_FILE = /\.(.*)$/;

// ============================================================
// Middleware
// ============================================================

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
    user = JSON.parse(decodeURIComponent(userCookie));
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = getUserRole(user);

  // UX: ADMIN visiting "/" → redirect to admin dashboard
  if (pathname === "/" && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/manage-users", request.url));
  }

  const allowed = isAllowed(pathname, role);

  if (!allowed) {
    return NextResponse.rewrite(new URL(FORBIDDEN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\..*|login|staff/login|register|api|forbidden).*)",
  ],
};
