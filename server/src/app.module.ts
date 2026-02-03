import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StaffModule } from './modules/staff/staff.module';
import { CoursesModule } from './modules/courses/courses.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { StudentsModule } from './modules/students/students.module';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { CourseOfferingsService } from './modules/course-offerings/course-offerings.service';
import { CourseOfferingsController } from './modules/course-offerings/course-offerings.controller';
import { CourseOfferingsModule } from './modules/course-offerings/course-offerings.module';
import { KnowledgeCategoriesModule } from './modules/knowledge-categories/knowledge-categories.module';

@Module({
  imports: [
    StaffModule,
    CoursesModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    StudentsModule,
    AuthModule,
    CourseOfferingsModule,
    KnowledgeCategoriesModule,
  ],
  controllers: [AppController, CourseOfferingsController],
  providers: [AppService, CourseOfferingsService],
})
export class AppModule {}
