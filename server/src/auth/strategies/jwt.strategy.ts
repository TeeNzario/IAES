import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, RequestUser } from '../types/jwt-payload.type';
import { DEFAULT_JWT_SECRET } from '../constants';
import { PrismaService } from 'src/prisma/prisma.service';

type PasswordChangedAtRow = { password_changed_at: Date };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET,
    });
  }

  private async getStaffPasswordChangedAt(
    staffUserId: string,
  ): Promise<Date | null> {
    let id: bigint;

    try {
      id = BigInt(staffUserId);
    } catch {
      throw new UnauthorizedException('Invalid staff token');
    }

    const rows = await this.prisma.$queryRaw<PasswordChangedAtRow[]>`
      SELECT "password_changed_at"
      FROM "staff_users"
      WHERE "staff_users_id" = ${id}
      LIMIT 1
    `;

    return rows[0]?.password_changed_at ?? null;
  }

  private async getStudentPasswordChangedAt(
    studentCode: string,
  ): Promise<Date | null> {
    const rows = await this.prisma.$queryRaw<PasswordChangedAtRow[]>`
      SELECT "password_changed_at"
      FROM "students"
      WHERE "student_code" = ${studentCode}
      LIMIT 1
    `;

    return rows[0]?.password_changed_at ?? null;
  }

  private assertTokenIssuedAfterPasswordChange(
    payload: JwtPayload,
    passwordChangedAt: Date | null,
  ) {
    if (!passwordChangedAt) {
      throw new UnauthorizedException('Invalid token subject');
    }

    if (!payload.iat) {
      throw new UnauthorizedException('Invalid token issued-at claim');
    }

    const issuedAtMs = payload.iat * 1000;
    const changedAtMs = passwordChangedAt.getTime();

    if (issuedAtMs + 1000 < changedAtMs) {
      throw new UnauthorizedException('Token was issued before password change');
    }
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (payload.type === 'staff') {
      if (!payload.role) {
        throw new UnauthorizedException('Invalid staff token');
      }

      this.assertTokenIssuedAfterPasswordChange(
        payload,
        await this.getStaffPasswordChangedAt(String(payload.sub)),
      );

      return {
        sub: String(payload.sub),
        type: 'staff',
        role: payload.role,
      };
    }

    this.assertTokenIssuedAfterPasswordChange(
      payload,
      await this.getStudentPasswordChangedAt(String(payload.sub)),
    );

    return {
      sub: String(payload.sub),
      type: 'student',
    };
  }
}
