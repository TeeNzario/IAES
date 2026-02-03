import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { KnowledgeCategoriesService } from './knowledge-categories.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from 'src/auth/guards/roles.guard';

@Controller('knowledge-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeCategoriesController {
  constructor(
    private readonly knowledgeCategoriesService: KnowledgeCategoriesService,
  ) {}

  @Get()
  @Roles('INSTRUCTOR')
  search(@Query('search') search?: string) {
    return this.knowledgeCategoriesService.search(search || '');
  }
}
