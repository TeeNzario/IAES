import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Auth, Roles } from 'src/auth/guards';
import type { AuthenticatedRequest } from 'src/auth/types/jwt-payload.type';
import { BehaviorEventDto } from './dto/behavior-event.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { ExamAttemptsService } from './exam-attempts.service';

function staffActor(req: AuthenticatedRequest) {
  if (req.user.type !== 'staff') {
    throw new BadRequestException('Staff access required');
  }
  const user = req.user;
  return { staffUserId: user.sub, role: user.role };
}

@Controller('course-offerings/:offeringId/exams/:examId')
@Auth()
export class ExamAttemptsController {
  constructor(private readonly service: ExamAttemptsService) {}

  @Post('attempt/start')
  start(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
  ) {
    return this.service.start(offeringId, examId, req.user);
  }

  @Get('attempt')
  getAttempt(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
  ) {
    return this.service.getAttempt(offeringId, examId, req.user);
  }

  @Patch('attempt/items/:attemptItemId/answer')
  saveAnswer(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
    @Param('attemptItemId') attemptItemId: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.service.saveAnswer(
      offeringId,
      examId,
      attemptItemId,
      dto,
      req.user,
    );
  }

  @Post('attempt/submit')
  submit(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
  ) {
    return this.service.submit(offeringId, examId, req.user);
  }

  @Post('attempt/events')
  recordEvent(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
    @Body() dto: BehaviorEventDto,
  ) {
    return this.service.recordEvent(offeringId, examId, dto, req.user);
  }

  @Get('attempts/summary')
  @Roles('INSTRUCTOR', 'ADMIN')
  getSummary(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('examId') examId: string,
  ) {
    return this.service.getSummary(offeringId, examId, staffActor(req));
  }
}
