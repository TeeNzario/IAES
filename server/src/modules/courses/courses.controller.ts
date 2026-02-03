import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.guard';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles('INSTRUCTOR')
  create(@Req() req, @Body() createCourseDto: CreateCourseDto) {
    console.log('DTO:', createCourseDto);
    return this.coursesService.create(createCourseDto, req.user.id);
  }

  @Get()
  @Roles('INSTRUCTOR')
  findAll(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coursesService.findAllByCreator(
      req.user.id,
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
  @Roles('INSTRUCTOR')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(+id, updateCourseDto, req.user.id);
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
