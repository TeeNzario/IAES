export interface Staff {
  staff_users_id: string;
  first_name?: string;
  last_name?: string;
  role: "INSTRUCTOR" | "ADMIN";
  email?: string;
  is_active: boolean;
  facultyCode: number;
}
