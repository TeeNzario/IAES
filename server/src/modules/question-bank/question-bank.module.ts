import { Module } from '@nestjs/common';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankService } from './question-bank.service';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  controllers: [QuestionBankController, QuestionsController],
  providers: [QuestionBankService, QuestionsService],
})
export class QuestionBankModule {}
