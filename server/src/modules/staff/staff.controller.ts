import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard, RolesGuard, Roles } from 'src/auth/guards';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }

  // Get current authenticated user info
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req) {
    console.log('req.user in staff controller: ', req.user.id);
    return this.staffService.findById(req.user.id);
  }

  /**
   * Get all staff with optional role filter
   * @query role - Optional role filter: INSTRUCTOR or ADMINISTRATOR
   */
  @Get()
  findAll(@Query('role') role?: string) {
    return this.staffService.findAll(role);
  }

  @Get('instructors')
  findAllInstructors() {
    return this.staffService.findAllInstructors();
  }

  /**
   * Check if email already exists
   * Used for frontend validation
   */
  @Get('check-email')
  async checkEmailExists(
    @Query('email') email: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.staffService.checkEmailExists(email, excludeId);
    return { exists };
  }

  @Get(':id')
  findOne(@Param('id') id: bigint) {
    return this.staffService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto) {
    return this.staffService.update(BigInt(id), updateStaffDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.staffService.remove(BigInt(id));
  }
}
