/**
 * Auth Service - Centralized authentication management
 * Handles token storage, user info, and auth state
 */

// LocalStorage keys
const TOKEN_KEY = "access_token";
const USER_KEY = "user";

// Generic user type - can be Student or Staff
export interface AuthUser {
  id: string | number;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  [key: string]: unknown; // Allow additional properties
}

export interface LoginResponse<T = AuthUser> {
  access_token: string;
  user?: T;
  student?: T; // For student login responses
  staff?: T; // For staff login responses
}

/**
 * Store authentication data after successful login
 */
export function setAuth<T extends AuthUser>(response: LoginResponse<T>): void {
  // Store the access token
  localStorage.setItem(TOKEN_KEY, response.access_token);

  // Store user info (could be user, student, or staff)
  const user = response.user || response.student || response.staff;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
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
  if (!userStr) return null;

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
 * Clear all auth data (logout)
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Logout and redirect to login page
 */
export function logout(redirectTo = "/admin/login"): void {
  clearAuth();
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}
