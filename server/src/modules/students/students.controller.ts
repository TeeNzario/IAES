import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UseGuards, Req } from '@nestjs/common';

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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req) {
    // For students, req.user.id is the student_code (from JWT sub)
    return this.studentsService.findById(String(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req, @Body() dto: UpdateStudentDto) {
    return this.studentsService.updateByStudentCode(String(req.user.id), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/enrollments')
  getMyEnrollments(@Req() req) {
    console.log('req.user : ', req.user);
    // For students, req.user.id is the student_code (from JWT sub)
    return this.studentsService.findEnrollments(String(req.user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Req() req,
  ) {
    // Allow student to update their own profile or admin to update any student
    if (String(req.user.id) !== id) {
      // Could add admin check here if needed
    }
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
