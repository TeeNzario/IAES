import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - automatically attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle 401 unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      // Also clear cookies
      document.cookie =
        "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Redirect to login page (only in browser)
      if (typeof window !== "undefined") {
        window.location.href = "/login";
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
