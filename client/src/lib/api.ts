import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function apiFetch<T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    data?: any;
    params?: any;
    headers?: Record<string, string>;
  }
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
    console.error('API Error:', error.message);
    // Add detailed logging
    console.error('Error type:', error.constructor.name);
    console.error('Full error:', error);
  } else {
    console.error('Unknown error:', error);
  }
  throw error;
}
}
