import { apiFetch } from "@/lib/api";
import { LoginDto } from "@/types/login";
import { AdminLoginDto } from "@/types/auth";

// Student login response
export interface StudentLoginResponse {
  access_token: string;
  student: {
    id: number;
    student_code: string;
    first_name: string;
    last_name: string;
  };
}

// Staff/Admin login response
export interface StaffLoginResponse {
  access_token: string;
  staff: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
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
