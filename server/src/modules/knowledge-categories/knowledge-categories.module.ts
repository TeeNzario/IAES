import { Module } from '@nestjs/common';
import { KnowledgeCategoriesService } from './knowledge-categories.service';
import { KnowledgeCategoriesController } from './knowledge-categories.controller';

@Module({
  controllers: [KnowledgeCategoriesController],
  providers: [KnowledgeCategoriesService],
})
export class KnowledgeCategoriesModule {}
