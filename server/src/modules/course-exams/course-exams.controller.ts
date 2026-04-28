import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Auth, Roles } from 'src/auth/guards';
import type {
  AuthenticatedRequest,
  StaffJwtPayload,
} from 'src/auth/types/jwt-payload.type';
import { CourseExamsService } from './course-exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

function staffActor(req: AuthenticatedRequest) {
  if (req.user.type !== 'staff') {
    throw new BadRequestException('Staff access required');
  }
  const u = req.user as StaffJwtPayload;
  return { staffUserId: u.sub, role: u.role };
}

@Controller('course-offerings/:offeringId/exams')
@Auth()
@Roles('INSTRUCTOR', 'ADMIN')
export class CourseExamsController {
  constructor(private readonly service: CourseExamsService) {}

  /** Create an exam with an ordered question list. */
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Body() dto: CreateExamDto,
  ) {
    return this.service.create(offeringId, dto, staffActor(req));
  }

  /** All exams for this offering, with derived status. */
  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
  ) {
    return this.service.listByOffering(offeringId, staffActor(req));
  }

  /** Full exam detail including its ordered questions. */
  @Get(':examId')
  getById(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
  ) {
    return this.service.getById(offeringId, examId, staffActor(req));
  }

  /** Full-replace update (core fields + exam_questions). */
  @Patch(':examId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.service.update(offeringId, examId, dto, staffActor(req));
  }

  /** Soft delete (is_active = false). */
  @Delete(':examId')
  softDelete(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
  ) {
    return this.service.softDelete(offeringId, examId, staffActor(req));
  }
}
