import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthTypeGuard } from '../guards/auth-type.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

export function Auth() {
  return applyDecorators(UseGuards(JwtAuthGuard, AuthTypeGuard, RolesGuard));
}
