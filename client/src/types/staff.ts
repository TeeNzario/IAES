export interface Staff {
  staff_users_id: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  role: "INSTRUCTOR" | "ADMIN";
  email?: string;
  is_active: boolean;
  facultyCode: number;
  curriculumId?: string;
}

// Lightweight instructor reference embedded in CourseOffering responses
export interface Instructor {
  staff_users_id: string;
  title?: string;
  first_name: string;
  last_name: string;
  facultyCode?: number;
  curriculumId?: string;
}
