import { IsString, IsOptional } from 'class-validator';

export class CreateCourseDto {
    @IsString()
    course_name: string;

    @IsString()
    description: string;

    @IsString()
    course_code: string;

    @IsString()
    @IsOptional()
    course_image: string;
}
