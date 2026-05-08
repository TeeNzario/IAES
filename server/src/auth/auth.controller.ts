import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, StudentLoginDto, StaffLoginDto } from './dto/login.dto';
import { Auth } from './guards';
import type { AuthenticatedRequest } from './types/jwt-payload.type';

const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private getCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    };
  }

  private setAuthCookies(
    res: Response,
    result: { access_token: string; user: unknown },
  ) {
    const cookieOptions = this.getCookieOptions();

    res.cookie('access_token', result.access_token, cookieOptions);
    res.cookie('user', JSON.stringify(result.user), cookieOptions);

    return { user: result.user };
  }

  private clearAuthCookies(res: Response) {
    const cookieOptions = this.getCookieOptions();

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('user', cookieOptions);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.identifier, dto.password);
    return this.setAuthCookies(res, result);
  }

  @Post('student/login')
  async loginStudent(
    @Body() dto: StudentLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginStudent(
      dto.student_code,
      dto.password,
    );
    return this.setAuthCookies(res, result);
  }

  @Post('staff/login')
  async loginStaff(
    @Body() dto: StaffLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginStaff(dto.email, dto.password);
    return this.setAuthCookies(res, result);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Auth()
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
