import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, RequestUser } from '../types/jwt-payload.type';
import { DEFAULT_JWT_SECRET } from '../constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET,
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
