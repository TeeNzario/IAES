import { Module } from '@nestjs/common';
import { ExamAttemptsController } from './exam-attempts.controller';
import { ExamAttemptsService } from './exam-attempts.service';

@Module({
  controllers: [ExamAttemptsController],
  providers: [ExamAttemptsService],
})
export class ExamAttemptsModule {}
