import { Module } from '@nestjs/common';
import { CourseOfferingsController } from './course-offerings.controller';
import { CourseOfferingsService } from './course-offerings.service';
import { PreviewImportService } from './preview-import.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CourseOfferingsController],
  providers: [CourseOfferingsService, PreviewImportService],
  exports: [CourseOfferingsService, PreviewImportService],
})
export class CourseOfferingsModule {}
