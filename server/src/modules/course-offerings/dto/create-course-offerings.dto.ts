import { IsString, IsOptional } from 'class-validator'

export class CreateCourseOfferingDto{
    courses_id: string;
    academic_year: number;
    semester: number;
    instructor_ids:  number[];
}