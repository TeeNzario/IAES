/**
 * Auth Service - Centralized authentication management.
 * Tokens live in httpOnly cookies set by the API. The browser stores only
 * non-sensitive user profile data for UI rendering.
 */

const USER_KEY = "user";
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// Old cookie names. Kept here only to clean up legacy client-written cookies.
const TOKEN_COOKIE = "access_token";
const USER_COOKIE = "user";

export type UserType = "STUDENT" | "STAFF";
export type StaffRole = "INSTRUCTOR" | "ADMIN";

export interface AuthUser {
  id: string | number;
  type: UserType;
  email?: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  student_code?: string;
  staff_role?: StaffRole;
}

export interface LoginResponse<T = AuthUser> {
  user: T;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

function clearLocalAuth(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem(USER_KEY);
  }

  deleteCookie(TOKEN_COOKIE);
  deleteCookie(USER_COOKIE);
}

export function setAuth<T extends AuthUser>(response: LoginResponse<T>): void {
  clearLocalAuth();

  const user = response.user;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getAccessToken(): string | null {
  return null;
}

export function getUser<T = AuthUser>(): T | null {
  if (typeof window === "undefined") return null;

  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) {
    return null;
  }

  try {
    return JSON.parse(userStr) as T;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getUser();
}

export function isInstructor(): boolean {
  const user = getUser<AuthUser>();
  return user?.type === "STAFF" && user?.staff_role === "INSTRUCTOR";
}

export function isStudent(): boolean {
  const user = getUser<AuthUser>();
  return user?.type === "STUDENT";
}

export function clearAuth(): void {
  clearLocalAuth();

  if (typeof window !== "undefined" && API_URL) {
    void fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
  }
}

export function logout(redirectTo = "/login"): void {
  clearAuth();
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}
