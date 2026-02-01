import { Injectable } from '@nestjs/common';
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

  /**
   * Transforms JWT payload into RequestUser object
   * This will be available as req.user in controllers
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    return {
      id: payload.sub,
      userType: payload.userType,
      email: payload.email,
      role: payload.role,
    };
  }
}
