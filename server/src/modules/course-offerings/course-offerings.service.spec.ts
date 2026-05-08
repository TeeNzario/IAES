import { Test, TestingModule } from '@nestjs/testing';
import { CourseOfferingsService } from './course-offerings.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('CourseOfferingsService', () => {
  let service: CourseOfferingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseOfferingsService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CourseOfferingsService>(CourseOfferingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
