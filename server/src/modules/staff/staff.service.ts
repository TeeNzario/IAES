import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  create(createStaffDto: CreateStaffDto) {
    return `This action adds a new staff`;
  }

  findAll() {
    return this.prisma.staff_users.findMany();
  }

  findOne(id: bigint) {
    return `This action returns a #${id} staff`;
  }

  update(id: bigint, updateStaffDto: UpdateStaffDto) {
    return this.prisma.staff_users.update({
      where: { staff_users_id: id },
      data: updateStaffDto,
    });
  }

  remove(id: bigint) {
    return this.prisma.staff_users.delete({
      where: { staff_users_id: id },
    });
  }
}
