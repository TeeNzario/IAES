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
  const res = await api.request<T>({
    url: path,
    method: options?.method ?? "GET",
    data: options?.data,
    params: options?.params,
    headers: options?.headers,
  });

  return res.data;
}
