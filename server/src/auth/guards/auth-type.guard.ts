import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AuthenticatedRequest,
  AuthUserType,
  RequestUser,
} from '../types/jwt-payload.type';

export const AUTH_TYPE_KEY = 'auth_type';

export const AuthType = (...types: AuthUserType[]) =>
  SetMetadata(AUTH_TYPE_KEY, types);

@Injectable()
export class AuthTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTypes = this.reflector.getAllAndOverride<AuthUserType[]>(
      AUTH_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTypes || requiredTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user: RequestUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!requiredTypes.includes(user.type)) {
      throw new ForbiddenException(
        `This route requires auth type: ${requiredTypes.join(' or ')}`,
      );
    }

    return true;
  }
}
