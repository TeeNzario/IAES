import { Module } from '@nestjs/common';
import { CourseExamsController } from './course-exams.controller';
import { CourseExamsService } from './course-exams.service';

@Module({
  controllers: [CourseExamsController],
  providers: [CourseExamsService],
})
export class CourseExamsModule {}
