import { apiFetch } from "@/lib/api";
import { AdminLoginDto, LoginDto } from "@/types/auth";
import type { StaffRole } from "@/lib/auth";

// Student login response
export interface StudentLoginResponse {
  access_token: string;
  user: {
    id: string;
    type: "STUDENT";
    student_code: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// Staff/Admin login response
export interface StaffLoginResponse {
  access_token: string;
  user: {
    id: number;
    type: "STAFF";
    email: string;
    first_name: string;
    last_name: string;
    staff_role: StaffRole;
  };
}

export function login(data: LoginDto): Promise<StudentLoginResponse> {
  return apiFetch<StudentLoginResponse>("/auth/student/login", {
    method: "POST",
    data,
  });
}

export function adminLogin(data: AdminLoginDto): Promise<StaffLoginResponse> {
  return apiFetch<StaffLoginResponse>("/auth/staff/login", {
    method: "POST",
    data,
  });
}
