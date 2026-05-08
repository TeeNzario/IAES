import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import {
  DEFAULT_CURRICULUM_ID,
  DEFAULT_TITLE,
} from 'src/lib/academic-defaults';
import { hashPassword } from '../../lib/password';

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

  /**
   * Create a new staff user
   * Password is stored as plain text per current requirement
   */
  async create(createStaffDto: CreateStaffDto) {
    // Check for duplicate email
    const existing = await this.prisma.staff_users.findUnique({
      where: { email: createStaffDto.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const staff = await this.prisma.staff_users.create({
      data: {
        email: createStaffDto.email,
        password_hash: await hashPassword(createStaffDto.password),
        facultyCode: createStaffDto.facultyCode,
        title: createStaffDto.title ?? DEFAULT_TITLE,
        curriculumId: createStaffDto.curriculumId ?? DEFAULT_CURRICULUM_ID,
        first_name: createStaffDto.first_name,
        last_name: createStaffDto.last_name,
        role: createStaffDto.role,
        is_active: true,
      },
      select: {
        staff_users_id: true,
        email: true,
        facultyCode: true,
        title: true,
        curriculumId: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
      },
    });

    return serializeBigInt(staff);
  }

  /**
   * Find all staff with optional role filter
   */
  async findAll(role?: string) {
    const where: any = {};

    if (role === 'INSTRUCTOR') {
      where.role = 'INSTRUCTOR';
    } else if (role === 'ADMINISTRATOR' || role === 'ADMIN') {
      where.role = 'ADMIN';
    }

    const staff = await this.prisma.staff_users.findMany({
      where,
      select: {
        staff_users_id: true,
        email: true,
        facultyCode: true,
        title: true,
        curriculumId: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
      },
      orderBy: { staff_users_id: 'asc' },
    });

    return { data: serializeBigInt(staff) };
  }

  async findAllInstructors() {
    const staff = await this.prisma.staff_users.findMany({
      where: {
        role: 'INSTRUCTOR',
      },
      select: {
        staff_users_id: true,
        first_name: true,
        last_name: true,
        email: true,
        facultyCode: true,
        title: true,
        curriculumId: true,
      },
    });
    return serializeBigInt(staff);
  }

  async findById(id: string) {
    const staff = await this.prisma.staff_users.findUnique({
      where: { staff_users_id: BigInt(id) },
      select: {
        staff_users_id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        facultyCode: true,
        title: true,
        curriculumId: true,
        is_active: true,
      },
    });
    return serializeBigInt(staff);
  }

  findOne(id: bigint) {
    return `This action returns a #${id} staff`;
  }

  async update(id: bigint, updateStaffDto: UpdateStaffDto) {
    // ADMIN protection: Cannot change is_active status for ADMIN users
    if (updateStaffDto.is_active !== undefined) {
      const existingStaff = await this.prisma.staff_users.findUnique({
        where: { staff_users_id: id },
        select: { role: true },
      });

      if (existingStaff?.role === 'ADMIN') {
        // Remove is_active from update data for ADMIN users
        delete updateStaffDto.is_active;
      }
    }

    const { password, ...rest } = updateStaffDto;
    const data = password
      ? { ...rest, password_hash: await hashPassword(password) }
      : rest;

    const updated = await this.prisma.staff_users.update({
      where: { staff_users_id: id },
      data,
      select: {
        staff_users_id: true,
        email: true,
        facultyCode: true,
        title: true,
        curriculumId: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
      },
    });
    return serializeBigInt(updated);
  }

  async remove(id: bigint) {
    await this.prisma.staff_users.delete({
      where: { staff_users_id: id },
    });
    return { success: true };
  }

  /**
   * Check if email already exists
   * @param email - The email to check
   * @param excludeId - Optional ID to exclude (for edit mode)
   */
  async checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
    if (!email?.trim()) return false;

    const where: any = { email: email.trim() };

    if (excludeId) {
      where.NOT = { staff_users_id: BigInt(excludeId) };
    }

    const existing = await this.prisma.staff_users.findFirst({
      where,
      select: { staff_users_id: true },
    });

    return existing !== null;
  }
}
