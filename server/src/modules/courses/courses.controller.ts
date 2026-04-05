import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { Auth, Roles } from 'src/auth/guards';
import type { AuthenticatedRequest } from 'src/auth/types/jwt-payload.type';

@Controller('courses')
@Auth()
@Roles('INSTRUCTOR')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createCourseDto: CreateCourseDto,
  ) {
    return this.coursesService.create(createCourseDto, req.user.sub);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coursesService.findAllByCreator(
      req.user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Check if a course code already exists
   * Used for frontend validation before form submission
   */
  @Get('check-code')
  @Roles('INSTRUCTOR')
  async checkCodeExists(
    @Query('code') code: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.coursesService.checkCodeExists(
      code,
      excludeId ? parseInt(excludeId, 10) : undefined,
    );
    return { exists };
  }

  /**
   * Check if a course name already exists
   * Used for frontend validation before form submission
   */
  @Get('check-name')
  @Roles('INSTRUCTOR')
  async checkNameExists(
    @Query('name') name: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.coursesService.checkNameExists(
      name,
      excludeId ? parseInt(excludeId, 10) : undefined,
    );
    return { exists };
  }

  @Get(':id')
  @Roles('INSTRUCTOR')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(+id, updateCourseDto, req.user.sub);
  }

  @Patch(':id/status')
  @Roles('INSTRUCTOR')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.coursesService.updateStatus(+id, dto.is_active);
  }

  @Delete(':id')
  @Roles('INSTRUCTOR')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(+id);
  }
}
