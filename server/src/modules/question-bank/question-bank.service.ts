import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuestionBankYearDto } from './dto/create-year.dto';
import { CreateQuestionCollectionDto } from './dto/create-collection.dto';
import { UpdateQuestionCollectionDto } from './dto/update-collection.dto';
import type { StaffRole } from 'src/auth/types/jwt-payload.type';

function serializeBigInt<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
}

interface StaffActor {
  staffUserId: string;
  role: StaffRole;
}

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve a course offering id to its parent courses_id and authorize the
   * actor: ADMIN bypasses; INSTRUCTOR must teach at least one offering of the
   * same course (course_instructors edge).
   */
  private async resolveCourseAndAuthorize(
    offeringId: string,
    actor: StaffActor,
  ): Promise<bigint> {
    const offering = await this.prisma.course_offerings.findUnique({
      where: { course_offerings_id: BigInt(offeringId) },
      select: { courses_id: true },
    });

    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    if (actor.role === 'ADMIN') {
      return offering.courses_id;
    }

    // Instructor must be linked to ANY offering of this course.
    const link = await this.prisma.course_instructors.findFirst({
      where: {
        staff_users_id: BigInt(actor.staffUserId),
        course_offerings: { courses_id: offering.courses_id },
      },
      select: { staff_users_id: true },
    });

    if (!link) {
      throw new ForbiddenException(
        'You are not an instructor of this course',
      );
    }

    return offering.courses_id;
  }

  // ------------------------- YEAR FOLDERS -------------------------

  async listYears(offeringId: string, actor: StaffActor) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);

    const years = await this.prisma.question_bank_years.findMany({
      where: { courses_id: coursesId, is_active: true },
      orderBy: { academic_year: 'asc' },
      select: {
        question_bank_year_id: true,
        academic_year: true,
        created_at: true,
        updated_at: true,
        _count: { select: { question_collections: true } },
      },
    });

    return serializeBigInt(years);
  }

  async createYear(
    offeringId: string,
    dto: CreateQuestionBankYearDto,
    actor: StaffActor,
  ) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);

    try {
      const year = await this.prisma.question_bank_years.create({
        data: {
          courses_id: coursesId,
          academic_year: dto.academic_year,
          created_by_staff_id: BigInt(actor.staffUserId),
        },
      });
      return serializeBigInt(year);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'This academic year folder already exists for this course',
        );
      }
      throw err;
    }
  }

  // ------------------------- COLLECTIONS -------------------------

  private async getYearOrThrow(
    offeringId: string,
    academicYear: number,
    actor: StaffActor,
  ) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);
    const year = await this.prisma.question_bank_years.findUnique({
      where: {
        courses_id_academic_year: {
          courses_id: coursesId,
          academic_year: academicYear,
        },
      },
      select: { question_bank_year_id: true, courses_id: true },
    });

    if (!year || !year) {
      throw new NotFoundException('Year folder not found');
    }
    return year;
  }

  async getCollection(
    offeringId: string,
    collectionId: string,
    actor: StaffActor,
  ) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);
    const collection = await this.prisma.question_collections.findUnique({
      where: { question_collection_id: BigInt(collectionId) },
      select: {
        question_collection_id: true,
        title: true,
        description: true,
        is_active: true,
        question_bank_years: {
          select: {
            question_bank_year_id: true,
            academic_year: true,
            courses_id: true,
          },
        },
      },
    });
    if (!collection || !collection.is_active) {
      throw new NotFoundException('Collection not found');
    }
    if (collection.question_bank_years.courses_id !== coursesId) {
      throw new ForbiddenException('Collection does not belong to this course');
    }
    return serializeBigInt(collection);
  }

  async listCollections(
    offeringId: string,
    academicYear: number,
    actor: StaffActor,
  ) {
    const year = await this.getYearOrThrow(offeringId, academicYear, actor);

    const collections = await this.prisma.question_collections.findMany({
      where: {
        question_bank_year_id: year.question_bank_year_id,
        is_active: true,
      },
      orderBy: { created_at: 'asc' },
      select: {
        question_collection_id: true,
        title: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });

    return serializeBigInt(collections);
  }

  async createCollection(
    offeringId: string,
    academicYear: number,
    dto: CreateQuestionCollectionDto,
    actor: StaffActor,
  ) {
    const year = await this.getYearOrThrow(offeringId, academicYear, actor);

    try {
      const collection = await this.prisma.question_collections.create({
        data: {
          question_bank_year_id: year.question_bank_year_id,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          created_by_staff_id: BigInt(actor.staffUserId),
        },
      });
      return serializeBigInt(collection);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'A collection with this title already exists in this year',
        );
      }
      throw err;
    }
  }

  async updateCollection(
    offeringId: string,
    collectionId: string,
    dto: UpdateQuestionCollectionDto,
    actor: StaffActor,
  ) {
    const coursesId = await this.resolveCourseAndAuthorize(offeringId, actor);

    // Authorize ownership: collection must belong to a year of this course.
    const existing = await this.prisma.question_collections.findUnique({
      where: { question_collection_id: BigInt(collectionId) },
      select: {
        question_collection_id: true,
        question_bank_years: { select: { courses_id: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Collection not found');
    }
    if (existing.question_bank_years.courses_id !== coursesId) {
      throw new ForbiddenException('Collection does not belong to this course');
    }

    try {
      const updated = await this.prisma.question_collections.update({
        where: { question_collection_id: BigInt(collectionId) },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() || null }
            : {}),
          updated_at: new Date(),
        },
      });
      return serializeBigInt(updated);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'A collection with this title already exists in this year',
        );
      }
      throw err;
    }
  }
}
