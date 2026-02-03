import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, StaffRole } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Student Login
   * Uses student_code and password
   */
  async loginStudent(student_code: string, password: string) {
    const student = await this.prisma.students.findUnique({
      where: { student_code },
    });

    if (!student) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // TODO: Replace with bcrypt.compare() for production
    const isMatch = password === student.password_hash;
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!student.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    const payload: JwtPayload = {
      sub: student.student_code,
      userType: 'STUDENT',
      email: student.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: student.student_code,
        type: 'STUDENT' as const,
        student_code: student.student_code,
        email: student.email,
        first_name: student.first_name,
        last_name: student.last_name,
      },
    };
  }

  /**
   * Staff Login (INSTRUCTOR / ADMIN)
   * Uses email and password
   */
  async loginStaff(email: string, password: string) {
    const staff = await this.prisma.staff_users.findUnique({
      where: { email },
    });

    if (!staff) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // TODO: Replace with bcrypt.compare() for production
    const isMatch = password === staff.password_hash;
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!staff.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    const payload: JwtPayload = {
      sub: Number(staff.staff_users_id), // Convert BigInt to number
      userType: 'STAFF',
      email: staff.email,
      role: staff.role as StaffRole,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: Number(staff.staff_users_id),
        type: 'STAFF' as const,
        email: staff.email,
        first_name: staff.first_name,
        last_name: staff.last_name,
        staff_role: staff.role as StaffRole,
      },
    };
  }
}
