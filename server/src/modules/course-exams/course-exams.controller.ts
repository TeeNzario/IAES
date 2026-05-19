import {
  BadRequestException,
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
import { Auth, Roles } from 'src/auth/guards';
import type {
  AuthenticatedRequest,
  StaffJwtPayload,
} from 'src/auth/types/jwt-payload.type';
import { CourseExamsService } from './course-exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamAttemptsService } from '../exam-attempts/exam-attempts.service';

function staffActor(req: AuthenticatedRequest) {
  if (req.user.type !== 'staff') {
    throw new BadRequestException('Staff access required');
  }
  const u = req.user as StaffJwtPayload;
  return { staffUserId: u.sub, role: u.role };
}

@Controller('course-offerings/:offeringId/exams')
@Auth()
export class CourseExamsController {
  constructor(
    private readonly service: CourseExamsService,
    private readonly examAttemptsService: ExamAttemptsService,
  ) {}

  /** Create an exam with an ordered question list. */
  @Post()
  @Roles('INSTRUCTOR', 'ADMIN')
  create(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Body() dto: CreateExamDto,
  ) {
    return this.service.create(offeringId, dto, staffActor(req));
  }

  /**
   * All exams for this offering, with derived status.
   * Pass ?draft=true to include unpublished exams (staff-only in exam-bank).
   * By default only is_published exams are returned.
   */
  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Query('draft') draft?: string,
  ) {
    return this.service.listByOffering(offeringId, req.user, draft === 'true');
  }

  /**
   * Fetch attempt summaries for multiple exams in a single request.
   * Accepts comma-separated exam IDs: ?exam_ids=1,2,3
   */
  @Get('attempts-summaries')
  @Roles('INSTRUCTOR', 'ADMIN')
  getAttemptsSummaries(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Query('exam_ids') examIds: string,
  ) {
    const ids = (examIds ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return [];
    return this.examAttemptsService.getSummariesForOffering(
      offeringId,
      ids,
      staffActor(req),
    );
  }

  /** Full exam detail including its ordered questions. */
  @Get(':examId')
  getById(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
  ) {
    return this.service.getById(offeringId, examId, req.user);
  }

  /** Full-replace update (core fields + exam_questions). */
  @Patch(':examId')
  @Roles('INSTRUCTOR', 'ADMIN')
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
  @Roles('INSTRUCTOR', 'ADMIN')
  softDelete(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
  ) {
    return this.service.softDelete(offeringId, examId, staffActor(req));
  }
}
