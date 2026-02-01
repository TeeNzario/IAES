import { Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from 'src/prisma/prisma.service';

function serializeBigInt(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}


@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto, instructor_id: number, image?: Express.Multer.File) {
    const course = await this.prisma.courses.create({
      data: {
        course_name: dto.course_name,
        description: dto.description,
        course_code: dto.course_code,
        course_image: image?.filename,
        created_by_instructors_id: BigInt(instructor_id),
      }
    });
    return serializeBigInt(course);
  }

 async findAllByCreator(instructorId: number) {
  const courses = await this.prisma.courses.findMany({
    where: {
      created_by_instructors_id: BigInt(instructorId),
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return serializeBigInt(courses);
}


  findOne(id: number) {
    return `This action returns a #${id} course`;
  }

  update(id: number, updateCourseDto: UpdateCourseDto) {
    return `This action updates a #${id} course`;
  }

  remove(id: number) {
    return `This action removes a #${id} course`;
  }
}
