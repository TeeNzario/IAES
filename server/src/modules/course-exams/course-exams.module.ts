import { Module } from '@nestjs/common';
import { CourseExamsController } from './course-exams.controller';
import { CourseExamsService } from './course-exams.service';
import { ExamAttemptsModule } from '../exam-attempts/exam-attempts.module';

@Module({
  imports: [ExamAttemptsModule],
  controllers: [CourseExamsController],
  providers: [CourseExamsService],
})
export class CourseExamsModule {}
