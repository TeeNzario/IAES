import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, StudentLoginDto, StaffLoginDto } from './dto/login.dto';
import { Auth } from './guards';
import type { AuthenticatedRequest } from './types/jwt-payload.type';

const LOGIN_THROTTLE = { short: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle(LOGIN_THROTTLE)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.identifier, dto.password);
  }

  @Post('student/login')
  @UseGuards(ThrottlerGuard)
  @Throttle(LOGIN_THROTTLE)
  async loginStudent(@Body() dto: StudentLoginDto) {
    return this.authService.loginStudent(dto.student_code, dto.password);
  }

  @Post('staff/login')
  @UseGuards(ThrottlerGuard)
  @Throttle(LOGIN_THROTTLE)
  async loginStaff(@Body() dto: StaffLoginDto) {
    return this.authService.loginStaff(dto.email, dto.password);
  }

  @Auth()
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
