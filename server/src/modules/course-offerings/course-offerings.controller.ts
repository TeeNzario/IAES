import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CourseOfferingsService } from './course-offerings.service';
import { PreviewImportService } from './preview-import.service';
import { CreateCourseOfferingDto } from './dto/create-course-offerings.dto';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto';
import { Auth, Roles } from 'src/auth/guards';
import { AddStudentDto } from './dto/add-student.dto';
import { BulkEnrollStudentDto } from './dto/bulk-enroll-student.dto';
import {
  CreatePreviewSessionDto,
  EditPreviewRowDto,
} from './dto/preview-import.dto';
import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/auth/types/jwt-payload.type';

@Controller('course-offerings')
export class CourseOfferingsController {
  constructor(
    private readonly courseOfferingsService: CourseOfferingsService,
    private readonly previewImportService: PreviewImportService,
  ) {}

  @Post()
  @Auth()
  @Roles('INSTRUCTOR')
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createCourseOfferingsDto: CreateCourseOfferingDto,
  ) {
    return this.courseOfferingsService.create(
      createCourseOfferingsDto,
      req.user.sub,
    );
  }

  /**
   * Get course offerings for the authenticated user.
   * - STAFF: returns courses they teach
   * - STUDENT: returns courses they are enrolled in
   */
  @Auth()
  @Get('/')
  getMyCourseOfferings(@Req() req: AuthenticatedRequest) {
    if (req.user.type === 'staff') {
      return this.courseOfferingsService.findByUser({
        type: 'staff',
        staffUserId: req.user.sub,
      });
    }

    if (req.user.type === 'student') {
      return this.courseOfferingsService.findByUser({
        type: 'student',
        studentCode: req.user.sub,
      });
    }

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
  @Auth()
  findOne(
    @Param('offeringId') offeringId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.courseOfferingsService.findOneById(offeringId, req.user);
  }

  @Patch(':offeringId')
  @Auth()
  @Roles('INSTRUCTOR')
  update(
    @Param('offeringId') offeringId: string,
    @Req() req: AuthenticatedRequest,
    @Body() updateDto: UpdateCourseOfferingDto,
  ) {
    return this.courseOfferingsService.update(
      offeringId,
      updateDto,
      req.user.sub,
    );
  }

  /**
   * Delete a course offering
   * Business rule: Can only delete if no students are enrolled
   */
  @Delete(':offeringId')
  @Auth()
  @Roles('INSTRUCTOR')
  remove(
    @Param('offeringId') offeringId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.courseOfferingsService.remove(offeringId, req.user.sub);
  }

  @Post(':offeringId/students')
  @Auth()
  @Roles('INSTRUCTOR')
  addStudent(
    @Param('offeringId') offeringId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddStudentDto,
  ) {
    return this.courseOfferingsService.addStudentToOffering(
      offeringId,
      dto,
      req.user.sub,
    );
  }

  @Get(':offeringId/students')
  @Auth()
  getStudents(
    @Param('offeringId') offeringId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.courseOfferingsService.getStudentsByOffering(
      offeringId,
      req.user,
    );
  }

  /**
   * Check if a student code already exists in this offering
   * Used for frontend validation before form submission
   */
  @Get(':offeringId/students/check-code')
  @Auth()
  @Roles('INSTRUCTOR')
  async checkCodeExists(
    @Param('offeringId') offeringId: string,
    @Req() req: AuthenticatedRequest,
    @Query('student_code') studentCode: string,
  ) {
    const exists = await this.courseOfferingsService.checkStudentCodeExists(
      offeringId,
      studentCode,
      req.user.sub,
    );
    return { exists };
  }

  /**
   * Check if an email already exists in this offering
   * Used for frontend validation before form submission
   */
  @Get(':offeringId/students/check-email')
  @Auth()
  @Roles('INSTRUCTOR')
  async checkEmailExists(
    @Param('offeringId') offeringId: string,
    @Req() req: AuthenticatedRequest,
    @Query('email') email: string,
  ) {
    const exists = await this.courseOfferingsService.checkStudentEmailExists(
      offeringId,
      email,
      req.user.sub,
    );
    return { exists };
  }

  /**
   * Un-enroll a student from a course offering
   * This removes the enrollment record, NOT the student record globally
   */
  @Delete(':offeringId/students/:studentCode')
  @Auth()
  @Roles('INSTRUCTOR')
  unenrollStudent(
    @Param('offeringId') offeringId: string,
    @Param('studentCode') studentCode: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.courseOfferingsService.unenrollStudent(
      offeringId,
      studentCode,
      req.user.sub,
    );
  }

  @Post(':offeringId/bulk-enroll')
  @Auth()
  @Roles('INSTRUCTOR')
  bulkEnroll(
    @Param('offeringId') offeringId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: BulkEnrollStudentDto,
  ) {
    return this.courseOfferingsService.bulkEnrollStudents(
      offeringId,
      dto,
      req.user.sub,
      {
        type: req.user.type,
        id: req.user.sub,
      },
    );
  }

  // =============== Preview Import Endpoints ===============

  @Post(':offeringId/import/preview')
  @Auth()
  @Roles('INSTRUCTOR')
  createPreviewSession(
    @Param('offeringId') offeringId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePreviewSessionDto,
  ) {
    return this.previewImportService.createPreviewSession(
      offeringId,
      req.user.sub,
      dto,
    );
  }

  @Get(':offeringId/import/preview/:sessionId')
  @Auth()
  @Roles('INSTRUCTOR')
  getPreviewSession(
    @Param('offeringId') offeringId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.previewImportService.getPreviewSession(
      offeringId,
      sessionId,
      req.user.sub,
    );
  }

  @Patch(':offeringId/import/preview/:sessionId/:rowIndex')
  @Auth()
  @Roles('INSTRUCTOR')
  editPreviewRow(
    @Param('offeringId') offeringId: string,
    @Param('sessionId') sessionId: string,
    @Param('rowIndex', ParseIntPipe) rowIndex: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: EditPreviewRowDto,
  ) {
    return this.previewImportService.editPreviewRow(
      offeringId,
      sessionId,
      rowIndex,
      dto,
      req.user.sub,
    );
  }

  @Delete(':offeringId/import/preview/:sessionId/:rowIndex')
  @Auth()
  @Roles('INSTRUCTOR')
  deletePreviewRow(
    @Param('offeringId') offeringId: string,
    @Param('sessionId') sessionId: string,
    @Param('rowIndex', ParseIntPipe) rowIndex: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.previewImportService.deletePreviewRow(
      offeringId,
      sessionId,
      rowIndex,
      req.user.sub,
    );
  }

  @Post(':offeringId/import/confirm/:sessionId')
  @Auth()
  @Roles('INSTRUCTOR')
  confirmImport(
    @Param('offeringId') offeringId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.previewImportService.confirmSession(
      offeringId,
      sessionId,
      req.user.sub,
      {
        type: req.user.type,
        id: req.user.sub,
      },
    );
  }
}
