import { Module } from '@nestjs/common';
import { AcademicSettingsController } from './academic-settings.controller';
import { AcademicSettingsService } from './academic-settings.service';

@Module({
  controllers: [AcademicSettingsController],
  providers: [AcademicSettingsService],
  exports: [AcademicSettingsService],
})
export class AcademicSettingsModule {}
