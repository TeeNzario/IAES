import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, StudentLoginDto, StaffLoginDto } from './dto/login.dto';
import { Auth } from './guards';
import type { AuthenticatedRequest } from './types/jwt-payload.type';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.identifier, dto.password);
  }

  @Post('student/login')
  async loginStudent(@Body() dto: StudentLoginDto) {
    return this.authService.loginStudent(dto.student_code, dto.password);
  }

  @Post('staff/login')
  async loginStaff(@Body() dto: StaffLoginDto) {
    return this.authService.loginStaff(dto.email, dto.password);
  }

  @Auth()
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
