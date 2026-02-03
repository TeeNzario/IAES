import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

function serializeBigInt(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  create(createStaffDto: CreateStaffDto) {
    return `This action adds a new staff`;
  }

  async findAll() {
    const staff = await this.prisma.staff_users.findMany({
      select: {
        staff_users_id: true,
        first_name: true,
        last_name: true,
        email: true,
      },
    });
    return serializeBigInt(staff);
  }

  async findById(id: number) {
    const staff = await this.prisma.staff_users.findUnique({
      where: { staff_users_id: BigInt(id) },
      select: {
        staff_users_id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
      },
    });
    return serializeBigInt(staff);
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
