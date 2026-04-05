import { Controller, Get, Query } from '@nestjs/common';
import { KnowledgeCategoriesService } from './knowledge-categories.service';
import { Auth, Roles } from 'src/auth/guards';

@Controller('knowledge-categories')
@Auth()
@Roles('INSTRUCTOR')
export class KnowledgeCategoriesController {
  constructor(
    private readonly knowledgeCategoriesService: KnowledgeCategoriesService,
  ) {}

  @Get()
  search(@Query('search') search?: string) {
    return this.knowledgeCategoriesService.search(search || '');
  }
}
