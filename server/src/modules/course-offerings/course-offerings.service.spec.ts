import { Test, TestingModule } from '@nestjs/testing';
import { CourseOfferingsService } from './course-offerings.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AcademicSettingsService } from '../academic-settings/academic-settings.service';

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
        {
          provide: AuditService,
          useValue: { record: jest.fn() },
        },
        {
          provide: AcademicSettingsService,
          useValue: {
            getCurrentTerm: jest
              .fn()
              .mockResolvedValue({ academic_year: 2026, semester: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get<CourseOfferingsService>(CourseOfferingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
