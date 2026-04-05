import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import {
  StaffJwtPayload,
  StaffRole,
  StudentJwtPayload,
} from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isStudentIdentifier(value: string): boolean {
    return /^\d{8}$/.test(value);
  }

  async login(identifier: string, password: string) {
    const normalizedIdentifier = identifier.trim();

    if (this.isEmail(normalizedIdentifier)) {
      return this.loginStaff(normalizedIdentifier, password);
    }

    if (this.isStudentIdentifier(normalizedIdentifier)) {
      return this.loginStudent(normalizedIdentifier, password);
    }

    throw new BadRequestException(
      'identifier must be a staff email or an 8-digit studentId',
    );
  }

  async loginStudent(studentCode: string, password: string) {
    const student = await this.prisma.students.findUnique({
      where: { student_code: studentCode },
    });

    if (!student) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (student.password_hash !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!student.is_active) {
      throw new UnauthorizedException('This account has been deactivated.');
    }

    const payload: StudentJwtPayload = {
      sub: student.student_code,
      type: 'student',
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

  async loginStaff(email: string, password: string) {
    const staff = await this.prisma.staff_users.findUnique({
      where: { email },
    });

    if (!staff) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (staff.password_hash !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!staff.is_active) {
      throw new UnauthorizedException('This account has been deactivated.');
    }

    const payload: StaffJwtPayload = {
      sub: staff.staff_users_id.toString(),
      type: 'staff',
      role: staff.role as StaffRole,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: staff.staff_users_id.toString(),
        type: 'STAFF' as const,
        email: staff.email,
        first_name: staff.first_name,
        last_name: staff.last_name,
        staff_role: staff.role as StaffRole,
      },
    };
  }
}
