import { Test, TestingModule } from '@nestjs/testing';
import { CourseOfferingsController } from './course-offerings.controller';

describe('CourseOfferingsController', () => {
  let controller: CourseOfferingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseOfferingsController],
    }).compile();

    controller = module.get<CourseOfferingsController>(CourseOfferingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
