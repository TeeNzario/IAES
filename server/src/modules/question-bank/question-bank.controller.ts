import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Auth, Roles } from 'src/auth/guards';
import type {
  AuthenticatedRequest,
  StaffJwtPayload,
} from 'src/auth/types/jwt-payload.type';
import { QuestionBankService } from './question-bank.service';
import { CreateQuestionBankYearDto } from './dto/create-year.dto';
import { CreateQuestionCollectionDto } from './dto/create-collection.dto';
import { UpdateQuestionCollectionDto } from './dto/update-collection.dto';

function staffActor(req: AuthenticatedRequest) {
  if (req.user.type !== 'staff') {
    throw new BadRequestException('Staff access required');
  }
  const u = req.user as StaffJwtPayload;
  return { staffUserId: u.sub, role: u.role };
}

@Controller('course-offerings/:offeringId/question-bank')
@Auth()
@Roles('INSTRUCTOR', 'ADMIN')
export class QuestionBankController {
  constructor(private readonly service: QuestionBankService) {}

  // -------------------- Year folders --------------------

  @Get('years')
  listYears(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
  ) {
    return this.service.listYears(offeringId, staffActor(req));
  }

  @Post('years')
  createYear(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Body() dto: CreateQuestionBankYearDto,
  ) {
    return this.service.createYear(offeringId, dto, staffActor(req));
  }

  // -------------------- Collections --------------------

  @Get('years/:year/collections')
  listCollections(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.service.listCollections(offeringId, year, staffActor(req));
  }

  @Post('years/:year/collections')
  createCollection(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('year', ParseIntPipe) year: number,
    @Body() dto: CreateQuestionCollectionDto,
  ) {
    return this.service.createCollection(
      offeringId,
      year,
      dto,
      staffActor(req),
    );
  }

  @Patch('collections/:collectionId')
  updateCollection(
    @Req() req: AuthenticatedRequest,
    @Param('offeringId') offeringId: string,
    @Param('collectionId') collectionId: string,
    @Body() dto: UpdateQuestionCollectionDto,
  ) {
    return this.service.updateCollection(
      offeringId,
      collectionId,
      dto,
      staffActor(req),
    );
  }
}
