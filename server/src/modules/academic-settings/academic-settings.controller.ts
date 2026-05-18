import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Auth, Roles } from 'src/auth/guards';
import type { AuthenticatedRequest } from 'src/auth/types/jwt-payload.type';
import { AcademicSettingsService } from './academic-settings.service';
import { UpdateAcademicSettingsDto } from './dto/update-academic-settings.dto';

@Controller('academic-settings')
export class AcademicSettingsController {
  constructor(
    private readonly academicSettingsService: AcademicSettingsService,
  ) {}

  @Get('current')
  @Auth()
  getCurrent() {
    return this.academicSettingsService.getCurrent();
  }

  @Patch('current')
  @Auth()
  @Roles('ADMIN')
  updateCurrent(
    @Body() dto: UpdateAcademicSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.academicSettingsService.updateCurrent(dto, {
      type: req.user.type,
      id: req.user.sub,
    });
  }
}
