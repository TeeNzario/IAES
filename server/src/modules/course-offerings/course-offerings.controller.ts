import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CourseOfferingsService } from './course-offerings.service';
import { PreviewImportService } from './preview-import.service';
import { CreateCourseOfferingDto } from './dto/create-course-offerings.dto';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto';
import { JwtAuthGuard, RolesGuard, Roles } from 'src/auth/guards';
import { AddStudentDto } from './dto/add-student.dto';
import { BulkEnrollStudentDto } from './dto/bulk-enroll-student.dto';
import {
  CreatePreviewSessionDto,
  EditPreviewRowDto,
} from './dto/preview-import.dto';
import { BadRequestException } from '@nestjs/common';

@Controller('course-offerings')
export class CourseOfferingsController {
  constructor(
    private readonly courseOfferingsService: CourseOfferingsService,
    private readonly previewImportService: PreviewImportService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  create(
    @Req() req,
    @Body() createCourseOfferingsDto: CreateCourseOfferingDto,
  ) {
    console.log('DTO:', createCourseOfferingsDto);
    return this.courseOfferingsService.create(
      createCourseOfferingsDto,
      req.user.id,
    );
  }

  /**
   * Get course offerings for the authenticated user.
   * - STAFF: returns courses they teach
   * - STUDENT: returns courses they are enrolled in
   */
  @UseGuards(JwtAuthGuard)
  @Get('/')
  getMyCourseOfferings(@Req() req) {
    // JWT strategy returns: { id, userType, email, role? }
    // For STAFF: id = staff_users_id (number)
    // For STUDENT: id = student_code (string)

    if (req.user.userType === 'STAFF') {
      return this.courseOfferingsService.findByUser({
        type: 'STAFF',
        staffUserId: Number(req.user.id),
      });
    }

    if (req.user.userType === 'STUDENT') {
      return this.courseOfferingsService.findByUser({
        type: 'STUDENT',
        studentCode: String(req.user.id),
      });
    }

    console.log('[getMyCourseOfferings] Unknown userType:', req.user.userType);
    throw new BadRequestException('Unknown user type');
  }

  //   @UseGuards(JwtAuthGuard)
  // @Get('me')
  // getMyCourseOfferings(@Req() req) {
  //   // student only
  //   if (req.user.type !== 'STUDENT') {
  //     throw new BadRequestException('Student only');
  //   }

  //   return this.courseOfferingsService.findByStudentCode(
  //     req.user.student_code,
  //   );
  // }

  @Get(':offeringId')
  findOne(@Param('offeringId') offeringId: string) {
    return this.courseOfferingsService.findOneById(offeringId);
  }

  @Patch(':offeringId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  update(
    @Param('offeringId') offeringId: string,
    @Req() req,
    @Body() updateDto: UpdateCourseOfferingDto,
  ) {
    return this.courseOfferingsService.update(
      offeringId,
      updateDto,
      req.user.id,
    );
  }

  @Post(':offeringId/students')
  addStudent(
    @Param('offeringId') offeringId: string,
    @Body() dto: AddStudentDto,
  ) {
    return this.courseOfferingsService.addStudentToOffering(offeringId, dto);
  }

  @Get(':offeringId/students')
  getStudents(@Param('offeringId') offeringId: string) {
    return this.courseOfferingsService.getStudentsByOffering(offeringId);
  }

  /**
   * Check if a student code already exists in this offering
   * Used for frontend validation before form submission
   */
  @Get(':offeringId/students/check-code')
  async checkCodeExists(
    @Param('offeringId') offeringId: string,
    @Query('student_code') studentCode: string,
  ) {
    const exists = await this.courseOfferingsService.checkStudentCodeExists(
      offeringId,
      studentCode,
    );
    return { exists };
  }

  /**
   * Check if an email already exists in this offering
   * Used for frontend validation before form submission
   */
  @Get(':offeringId/students/check-email')
  async checkEmailExists(
    @Param('offeringId') offeringId: string,
    @Query('email') email: string,
  ) {
    const exists = await this.courseOfferingsService.checkStudentEmailExists(
      offeringId,
      email,
    );
    return { exists };
  }

  /**
   * Un-enroll a student from a course offering
   * This removes the enrollment record, NOT the student record globally
   */
  @Delete(':offeringId/students/:studentCode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  unenrollStudent(
    @Param('offeringId') offeringId: string,
    @Param('studentCode') studentCode: string,
  ) {
    return this.courseOfferingsService.unenrollStudent(offeringId, studentCode);
  }

  @Post(':offeringId/bulk-enroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  bulkEnroll(
    @Param('offeringId') offeringId: string,
    @Body() dto: BulkEnrollStudentDto,
  ) {
    return this.courseOfferingsService.bulkEnrollStudents(offeringId, dto);
  }

  // =============== Preview Import Endpoints ===============

  @Post(':offeringId/import/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  createPreviewSession(
    @Param('offeringId') offeringId: string,
    @Req() req,
    @Body() dto: CreatePreviewSessionDto,
  ) {
    return this.previewImportService.createPreviewSession(
      offeringId,
      req.user.id,
      dto,
    );
  }

  @Get(':offeringId/import/preview/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  getPreviewSession(@Param('sessionId') sessionId: string) {
    return this.previewImportService.getPreviewSession(sessionId);
  }

  @Patch(':offeringId/import/preview/:sessionId/:rowIndex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  editPreviewRow(
    @Param('offeringId') offeringId: string,
    @Param('sessionId') sessionId: string,
    @Param('rowIndex', ParseIntPipe) rowIndex: number,
    @Body() dto: EditPreviewRowDto,
  ) {
    return this.previewImportService.editPreviewRow(
      offeringId,
      sessionId,
      rowIndex,
      dto,
    );
  }

  @Delete(':offeringId/import/preview/:sessionId/:rowIndex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  deletePreviewRow(
    @Param('sessionId') sessionId: string,
    @Param('rowIndex', ParseIntPipe) rowIndex: number,
  ) {
    return this.previewImportService.deletePreviewRow(sessionId, rowIndex);
  }

  @Post(':offeringId/import/confirm/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  confirmImport(
    @Param('offeringId') offeringId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.previewImportService.confirmSession(offeringId, sessionId);
  }
}
