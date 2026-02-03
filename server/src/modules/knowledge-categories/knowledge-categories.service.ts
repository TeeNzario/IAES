import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

function serializeBigInt(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
}

@Injectable()
export class KnowledgeCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string) {
    const categories = await this.prisma.knowledge_categories.findMany({
      where: query
        ? {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          }
        : {},
      select: {
        knowledge_category_id: true,
        name: true,
      },
      take: 10,
      orderBy: {
        name: 'asc',
      },
    });

    return serializeBigInt(categories);
  }
}
