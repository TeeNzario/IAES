export type UserType = 'STUDENT' | 'STAFF';
export type StaffRole = 'INSTRUCTOR' | 'ADMIN';

export interface JwtPayload {
  sub: string | number; // student_code or staff_users_id
  userType: UserType;
  email: string;
  role?: StaffRole; // Only for STAFF
}

export interface RequestUser {
  id: string | number;
  userType: UserType;
  email: string;
  role?: StaffRole;
}
