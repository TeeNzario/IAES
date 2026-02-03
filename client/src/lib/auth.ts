/**
 * Auth Service - Centralized authentication management
 * Handles token storage, user info, and auth state
 * Uses both localStorage (client) and cookies (middleware)
 */

// LocalStorage keys
const TOKEN_KEY = "access_token";
const USER_KEY = "user";

// Cookie names (used by middleware)
const TOKEN_COOKIE = "access_token";
const USER_COOKIE = "user";

// User types
export type UserType = "STUDENT" | "STAFF";
export type StaffRole = "INSTRUCTOR" | "ADMIN";

// AuthUser interface with proper typing
export interface AuthUser {
  id: string | number;
  type: UserType;
  email?: string;
  first_name?: string;
  last_name?: string;
  // Student-specific
  student_code?: string;
  // Staff-specific
  staff_role?: StaffRole;
}

export interface LoginResponse<T = AuthUser> {
  access_token: string;
  user: T;
}

/**
 * Set a cookie (client-side)
 */
function setCookie(name: string, value: string, days: number = 7): void {
  if (typeof document === "undefined") return;
  const expires = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000,
  ).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Store authentication data after successful login
 * Stores in both localStorage (for client) and cookies (for middleware)
 */
export function setAuth<T extends AuthUser>(response: LoginResponse<T>): void {
  // 🔥 ALWAYS clear old auth first
  clearAuth();

  localStorage.setItem(TOKEN_KEY, response.access_token);
  setCookie(TOKEN_COOKIE, response.access_token);

  console.log("Hello man ", response.user)

  const user = response.user;
  if (user) {
    const userJson = JSON.stringify(user);
    localStorage.setItem(USER_KEY, userJson);
    console.log("User stored in localStorage:", userJson);
    setCookie(USER_COOKIE, userJson);
  }
}


/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get the current user info
 */
export function getUser<T = AuthUser>(): T | null {
  if (typeof window === "undefined") return null;

  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) {
    console.log("No user found from auth");
    return null;
  }

  try {
    return JSON.parse(userStr) as T;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Check if user is an instructor
 */
export function isInstructor(): boolean {
  const user = getUser<AuthUser>();
  return user?.type === "STAFF" && user?.staff_role === "INSTRUCTOR";
}

/**
 * Check if user is a student
 */
export function isStudent(): boolean {
  const user = getUser<AuthUser>();
  return user?.type === "STUDENT";
}

/**
 * Clear all auth data (logout)
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  deleteCookie(TOKEN_COOKIE);
  deleteCookie(USER_COOKIE);
}

/**
 * Logout and redirect to login page
 */
export function logout(redirectTo = "/login"): void {
  clearAuth();
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}
