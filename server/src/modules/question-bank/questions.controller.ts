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
import { QuestionsService } from './questions.service';
import { BulkCreateQuestionsDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

function staffActor(req: AuthenticatedRequest) {
  if (req.user.type !== 'staff') {
    throw new BadRequestException('Staff access required');
  }
  const u = req.user as StaffJwtPayload;
  return { staffUserId: u.sub, role: u.role };
}

@Controller('course-offerings/:offeringId')
@Auth()
@Roles('INSTRUCTOR', 'ADMIN')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  /** List questions in a collection, paginated + searchable. */
  @Get('question-bank/collections/:collectionId/questions')
  list(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('collectionId') collectionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listByCollection(
      offeringId,
      collectionId,
      staffActor(req),
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        search,
      },
    );
  }

  /** Bulk-save multiple questions at once ("บันทึก"). */
  @Post('question-bank/collections/:collectionId/questions/bulk')
  bulkCreate(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('collectionId') collectionId: string,
    @Body() dto: BulkCreateQuestionsDto,
  ) {
    return this.service.bulkCreate(
      offeringId,
      collectionId,
      dto,
      staffActor(req),
    );
  }

  /** Edit a single question (replaces choices + tags if provided). */
  @Patch('question-bank/questions/:questionId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.service.update(offeringId, questionId, dto, staffActor(req));
  }

  /** Soft-delete (is_active = false). */
  @Delete('question-bank/questions/:questionId')
  softDelete(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.service.softDelete(offeringId, questionId, staffActor(req));
  }

  /** Tags available for this offering's course (thin proxy for UI dropdown). */
  @Get('knowledge-categories')
  listTags(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
  ) {
    return this.service.listCourseTags(offeringId, staffActor(req));
  }
}
