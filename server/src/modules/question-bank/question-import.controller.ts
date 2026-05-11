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
import { QuestionImportService } from './question-import.service';
import {
  CreateQuestionImportSessionDto,
  EditQuestionImportRowDto,
} from './dto/question-import.dto';

function staffActor(req: AuthenticatedRequest) {
  if (req.user.type !== 'staff') {
    throw new BadRequestException('Staff access required');
  }
  const u = req.user as StaffJwtPayload;
  return { staffUserId: u.sub, role: u.role };
}

@Controller('course-offerings/:offeringId/question-bank/import')
@Auth()
@Roles('INSTRUCTOR', 'ADMIN')
export class QuestionImportController {
  constructor(private readonly service: QuestionImportService) {}

  /** Upload CSV → validate → create preview session */
  @Post('preview')
  createPreview(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Body() dto: CreateQuestionImportSessionDto,
  ) {
    return this.service.createPreviewSession(offeringId, staffActor(req), dto);
  }

  /** Get session with rows and summary */
  @Get('preview/:sessionId')
  getPreview(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getPreviewSession(offeringId, sessionId, staffActor(req));
  }

  /** Edit a preview row */
  @Patch('preview/:sessionId/:rowIndex')
  editRow(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('sessionId') sessionId: string,
    @Param('rowIndex') rowIndex: string,
    @Body() dto: EditQuestionImportRowDto,
  ) {
    return this.service.editPreviewRow(
      offeringId,
      sessionId,
      parseInt(rowIndex, 10),
      staffActor(req),
      dto,
    );
  }

  /** Soft-delete a preview row */
  @Delete('preview/:sessionId/:rowIndex')
  deleteRow(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('sessionId') sessionId: string,
    @Param('rowIndex') rowIndex: string,
  ) {
    return this.service.deletePreviewRow(
      offeringId,
      sessionId,
      parseInt(rowIndex, 10),
      staffActor(req),
    );
  }

  /** Confirm → bulk create → delete session */
  @Post('confirm/:sessionId')
  confirm(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.confirmSession(offeringId, sessionId, staffActor(req));
  }
}
