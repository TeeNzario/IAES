import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Auth, AuthType, Roles } from 'src/auth/guards';
import type { AuthenticatedRequest } from 'src/auth/types/jwt-payload.type';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  /**
   * Check if student code already exists
   * Used for frontend validation
   */
  @Get('check-code')
  async checkCodeExists(
    @Query('student_code') studentCode: string,
    @Query('excludeCode') excludeCode?: string,
  ) {
    const exists = await this.studentsService.checkStudentCodeExists(
      studentCode,
      excludeCode,
    );
    return { exists };
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.studentsService.findOne(id);
  // }

  @Get('me')
  @Auth()
  @AuthType('student')
  getMe(@Req() req: AuthenticatedRequest) {
    return this.studentsService.findById(req.user.sub);
  }

  @Patch('me')
  @Auth()
  @AuthType('student')
  updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateStudentDto) {
    return this.studentsService.updateByStudentCode(req.user.sub, dto);
  }

  @Get('me/enrollments')
  @Auth()
  @AuthType('student')
  getMyEnrollments(@Req() req: AuthenticatedRequest) {
    return this.studentsService.findEnrollments(req.user.sub);
  }

  @Patch(':id')
  @Auth()
  update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user.type === 'student' && req.user.sub !== id) {
      throw new ForbiddenException(
        'Students can only update their own profile',
      );
    }

    if (req.user.type === 'staff' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin staff can update students');
    }

    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  @Auth()
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
