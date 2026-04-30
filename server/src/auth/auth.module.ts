import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthTypeGuard } from './guards/auth-type.guard';
import { RolesGuard } from './guards/roles.guard';
import { DEFAULT_JWT_SECRET } from './constants';

@Module({
  imports: [
    PassportModule,
    // registerAsync (instead of register) so the secret is resolved AFTER
    // ConfigModule.forRoot has loaded .env / .env.local. Using
    // process.env.JWT_SECRET at module-import time was racing the env loader
    // and falling back to DEFAULT_JWT_SECRET, which then disagreed with
    // JwtStrategy (constructed later, when env was populated) and produced
    // 401s on every request right after a successful login.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET,
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, AuthTypeGuard],
  exports: [RolesGuard, AuthTypeGuard],
})
export class AuthModule {}
