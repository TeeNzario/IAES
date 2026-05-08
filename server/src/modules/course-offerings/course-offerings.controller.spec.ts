import { Test, TestingModule } from '@nestjs/testing';
import { CourseOfferingsController } from './course-offerings.controller';
import { CourseOfferingsService } from './course-offerings.service';
import { PreviewImportService } from './preview-import.service';

describe('CourseOfferingsController', () => {
  let controller: CourseOfferingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseOfferingsController],
      providers: [
        {
          provide: CourseOfferingsService,
          useValue: {},
        },
        {
          provide: PreviewImportService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<CourseOfferingsController>(CourseOfferingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
