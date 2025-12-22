import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(student_code: string, password: string) {
    const student = await this.prisma.students.findUnique({
      where: { student_code },
    });

    if (!student) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = () => {
        return password === student.password_hash;
    }
    if (!isMatch()) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: student.student_code,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
