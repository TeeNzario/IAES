import { Module } from '@nestjs/common';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankService } from './question-bank.service';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { QuestionImportController } from './question-import.controller';
import { QuestionImportService } from './question-import.service';

@Module({
  controllers: [QuestionBankController, QuestionsController, QuestionImportController],
  providers: [QuestionBankService, QuestionsService, QuestionImportService],
})
export class QuestionBankModule {}
