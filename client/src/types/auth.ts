export interface LoginDto {
  identifier: string;
  password: string;
}

export type UserType = "STAFF" | "STUDENT";
export type StaffRole = "ADMIN" | "INSTRUCTOR";

export interface AuthUser {
  id: string | number;
  type?: UserType;
  userType?: UserType;
  email?: string;
  first_name?: string;
  last_name?: string;
  student_code?: string;
  staff_role?: StaffRole;
  role?: StaffRole;
}
