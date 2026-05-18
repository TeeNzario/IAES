import { Module } from '@nestjs/common';
import { CourseOfferingsController } from './course-offerings.controller';
import { CourseOfferingsService } from './course-offerings.service';
import { PreviewImportService } from './preview-import.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AcademicSettingsModule } from '../academic-settings/academic-settings.module';

@Module({
  imports: [PrismaModule, AcademicSettingsModule],
  controllers: [CourseOfferingsController],
  providers: [CourseOfferingsService, PreviewImportService],
  exports: [CourseOfferingsService, PreviewImportService],
})
export class CourseOfferingsModule {}
