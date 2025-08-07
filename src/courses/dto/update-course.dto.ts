import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';

// The core subject of a course should be immutable.
export class UpdateCourseDto extends PartialType(CreateCourseDto) {
    subject_id?: never;
}