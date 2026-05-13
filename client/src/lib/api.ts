import axios from "axios";
import { clearAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor - handle 401 unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Check if we're on a login page - don't redirect if already there
      const isOnLoginPage =
        typeof window !== "undefined" &&
        (window.location.pathname === "/login" ||
          window.location.pathname === "/staff/login");

      // Only clear auth and redirect if NOT on login page
      if (!isOnLoginPage) {
        clearAuth();

        // Redirect to login page (only in browser)
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export async function apiFetch<T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    data?: any;
    params?: any;
    headers?: Record<string, string>;
  },
): Promise<T> {
  try {
    const res = await api.request<T>({
      url: path,
      method: options?.method ?? "GET",
      data: options?.data,
      params: options?.params,
      // Add timeout
      timeout: 10000,
    });
    return res.data;
  } catch (error) {
    if (error instanceof Error) {
      console.error("API Error:", error.message);
      // Add detailed logging
      console.error("Error type:", error.constructor.name);
      console.error("Full error:", error);
    } else {
      console.error("Unknown error:", error);
    }
    throw error;
  }
}
