import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { RequestUser } from '../types/jwt-payload.type';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * Usage: @Roles('STAFF') or @Roles('INSTRUCTOR', 'ADMIN')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if STAFF is required
    if (requiredRoles.includes('STAFF')) {
      if (user.userType !== 'STAFF') {
        throw new ForbiddenException('Staff access required');
      }
      return true;
    }

    // Check if STUDENT is required
    if (requiredRoles.includes('STUDENT')) {
      if (user.userType !== 'STUDENT') {
        throw new ForbiddenException('Student access required');
      }
      return true;
    }

    // Check specific staff roles (INSTRUCTOR, ADMIN)
    if (user.userType === 'STAFF' && user.role) {
      if (requiredRoles.includes(user.role)) {
        return true;
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
