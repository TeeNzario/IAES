import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { StudentLoginDto, StaffLoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Student Login
   * POST /auth/student/login
   */
  @Post('student/login')
  async loginStudent(@Body() dto: StudentLoginDto) {
    return this.authService.loginStudent(dto.student_code, dto.password);
  }

  /**
   * Staff Login (INSTRUCTOR / ADMIN)
   * POST /auth/staff/login
   */
  @Post('staff/login')
  async loginStaff(@Body() dto: StaffLoginDto) {
    return this.authService.loginStaff(dto.email, dto.password);
  }
}
