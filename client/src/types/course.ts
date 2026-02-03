import { Instructor } from "./staff";

// Join table record
export interface CourseInstructor {
  staff_users_id: string; // BigInt serialized → string
  staff_users: Instructor;
}

// Course basic info
export interface CourseInfo {
  course_code: string;
  course_name: string;
}

// Course offering (main object)
export interface CourseOffering {
  course_offerings_id: string; // BigInt serialized → string
  academic_year: number;
  semester: number;
  is_active: boolean;
  courses: CourseInfo;
  course_instructors: CourseInstructor[];
}
