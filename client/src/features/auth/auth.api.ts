import { apiFetch } from "@/lib/api";
import { LoginDto } from "@/types/auth";

type RawUserType = "staff" | "student" | "STAFF" | "STUDENT";
type RawStaffRole = "admin" | "instructor" | "ADMIN" | "INSTRUCTOR";

interface RawLoginResponse {
  access_token: string;
  user: {
    id: string | number;
    type?: RawUserType;
    role?: RawStaffRole;
    staff_role?: RawStaffRole;
    student_code?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface UnifiedLoginResponse {
  access_token: string;
  user: {
    id: string | number;
    type: "STAFF" | "STUDENT";
    userType: "STAFF" | "STUDENT";
    role?: "ADMIN" | "INSTRUCTOR";
    staff_role?: "ADMIN" | "INSTRUCTOR";
    student_code?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

function normalizeUserType(type?: RawUserType): "STAFF" | "STUDENT" {
  return String(type).toLowerCase() === "staff" ? "STAFF" : "STUDENT";
}

function normalizeRole(
  role?: RawStaffRole,
): "ADMIN" | "INSTRUCTOR" | undefined {
  const normalized = String(role ?? "").toUpperCase();
  if (normalized === "ADMIN" || normalized === "INSTRUCTOR") {
    return normalized;
  }
  return undefined;
}

export async function login(data: LoginDto): Promise<UnifiedLoginResponse> {
  const raw = await apiFetch<RawLoginResponse>("/auth/login", {
    method: "POST",
    data,
  });

  const normalizedType = normalizeUserType(raw.user.type);
  const normalizedRole = normalizeRole(raw.user.role ?? raw.user.staff_role);

  return {
    access_token: raw.access_token,
    user: {
      ...raw.user,
      type: normalizedType,
      userType: normalizedType,
      role: normalizedRole,
      staff_role: normalizedRole,
    },
  };
}
