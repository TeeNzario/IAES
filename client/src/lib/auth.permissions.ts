/**
 * Role & Permission Configuration
 *
 * Single source of truth for route permissions.
 * All route protection logic flows through this module.
 */

// Canonical staff roles
export type Role = "ADMIN" | "INSTRUCTOR";

/** Sentinel value for users with no role (students). */
export const NO_ROLE: null = null;

export type ResolvedRole = Role | typeof NO_ROLE;

/** Shape of the user cookie parsed by middleware. */
export interface ParsedUser {
  type: string;
  staff_role?: Role;
  role?: string;
}

/**
 * Derive a normalized role from the parsed user cookie.
 *
 * - STAFF → return staff_role ("ADMIN" | "INSTRUCTOR")
 * - STUDENT → return NO_ROLE (null)
 */
export function getUserRole(user: ParsedUser | null): ResolvedRole {
  if (!user) return NO_ROLE;
  if (user.type === "STAFF") {
    const role = user.staff_role ?? user.role;
    if (role === "ADMIN" || role === "INSTRUCTOR") return role;
    return NO_ROLE;
  }
  return NO_ROLE; // STUDENT has no role field
}

// ============================================================
// Route → Allowed Roles Mapping
// ============================================================
// Each entry maps a path pattern to the roles allowed to access it.
//
// Rules evaluate top-to-bottom; first match wins.
// To add a new protected route, simply append an entry.
// ============================================================

export interface RouteRule {
  /** Exact match — only this pathname. */
  path?: string;
  /** Prefix match — any pathname starting with this value. */
  prefix?: string;
  /** Staff roles that are allowed. */
  allowedRoles: Role[];
  /** When true, students (NO_ROLE) may also access. */
  allowNoRole?: boolean;
}

export const ROUTE_RULES: RouteRule[] = [
  // /admin — ADMIN only
  { prefix: "/admin", allowedRoles: ["ADMIN"] },

  // / (home) — INSTRUCTOR + students, block ADMIN
  { path: "/", allowedRoles: ["INSTRUCTOR"], allowNoRole: true },

  // /course (exact list page) — INSTRUCTOR only
  { path: "/course", allowedRoles: ["INSTRUCTOR"] },

  // /course/[offeringId] and children — INSTRUCTOR + students
  { prefix: "/course/", allowedRoles: ["INSTRUCTOR"], allowNoRole: true },
];

/**
 * Check whether the resolved role is allowed for the given pathname.
 *
 * Returns `true` when access is permitted, `false` when it should be blocked.
 */
export function isAllowed(pathname: string, role: ResolvedRole): boolean {
  for (const rule of ROUTE_RULES) {
    const matchesExact = rule.path !== undefined && pathname === rule.path;
    const matchesPrefix =
      rule.prefix !== undefined && pathname.startsWith(rule.prefix);

    if (!matchesExact && !matchesPrefix) continue;

    // Rule matched — check authorization
    if (role !== NO_ROLE && rule.allowedRoles.includes(role)) return true;
    if (role === NO_ROLE && rule.allowNoRole) return true;
    return false; // matched a rule but role is not allowed
  }

  // No rule matched → public route, allow
  return true;
}
