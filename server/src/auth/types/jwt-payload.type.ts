import { Request } from 'express';

export type AuthUserType = 'staff' | 'student';
export type StaffRole = 'INSTRUCTOR' | 'ADMIN';

interface BaseJwtPayload {
  sub: string;
  type: AuthUserType;
}

export interface StaffJwtPayload extends BaseJwtPayload {
  type: 'staff';
  role: StaffRole;
}

export interface StudentJwtPayload extends BaseJwtPayload {
  type: 'student';
}

export type JwtPayload = StaffJwtPayload | StudentJwtPayload;
export type RequestUser = JwtPayload;

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
