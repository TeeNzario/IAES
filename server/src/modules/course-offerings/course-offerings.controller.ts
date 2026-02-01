import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { CourseOfferingsService } from './course-offerings.service';
import { CreateCourseOfferingDto } from './dto/create-course-offerings.dto';
import { JwtAuthGuard, RolesGuard, Roles } from 'src/auth/guards';

@Controller('course-offerings')
export class CourseOfferingsController {
  constructor(private readonly courseOfferingService: CourseOfferingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  create(
    @Req() req,
    @Body() createCourseOfferingsDto: CreateCourseOfferingDto,
  ) {
    // Backend prepends creator ID (req.user.id) to instructor list
    console.log('DTO:', createCourseOfferingsDto);

    return this.courseOfferingService.create(
      createCourseOfferingsDto,
      req.user.id,
    );
  }
}
