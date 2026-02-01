import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
} from '@nestjs/common';
import { CourseOfferingsService } from './course-offerings.service';
import { CreateCourseOfferingDto } from './dto/create-course-offerings.dto';
import { JwtAuthGuard, RolesGuard, Roles } from 'src/auth/guards';
import { AddStudentDto } from './dto/add-student.dto';

@Controller('course-offerings')
export class CourseOfferingsController {
  constructor(
    private readonly courseOfferingsService: CourseOfferingsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  create(
    @Req() req,
    @Body() createCourseOfferingsDto: CreateCourseOfferingDto,
  ) {
    // Backend prepends creator ID (req.user.id) to instructor list
    console.log('DTO:', createCourseOfferingsDto);

    return this.courseOfferingsService.create(
      createCourseOfferingsDto,
      req.user.id,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  findMyCourseOfferings(@Req() req) {
    return this.courseOfferingsService.findByInstructor(req.user.id);
  }

  @Get(':offeringId')
  findOne(@Param('offeringId') offeringId: string) {
    return this.courseOfferingsService.findOneById(offeringId);
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
}
