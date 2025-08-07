import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseModuleDto } from './create-course-module.dto';

// The parent course should not be changed after a module is created.
export class UpdateCourseModuleDto extends PartialType(CreateCourseModuleDto) {
    course_id?: never;
}