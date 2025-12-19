import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StaffModule } from './modules/staff/staff.module';
import { CoursesModule } from './modules/courses/courses.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { StudentsModule } from './modules/students/students.module';

@Module({
  imports: [StaffModule, CoursesModule, PrismaModule, ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: ['.env.local', '.env'],
  }), StudentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
