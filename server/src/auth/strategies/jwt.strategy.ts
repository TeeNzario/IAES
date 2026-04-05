import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, RequestUser } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'secret123',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (payload.type === 'staff') {
      if (!payload.role) {
        throw new UnauthorizedException('Invalid staff token');
      }

      return {
        sub: String(payload.sub),
        type: 'staff',
        role: payload.role,
      };
    }

    return {
      sub: String(payload.sub),
      type: 'student',
    };
  }
}
