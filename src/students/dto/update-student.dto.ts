import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentDto } from './create-student.dto';

// The school_id should generally be immutable for a student record.
export class UpdateStudentDto extends PartialType(CreateStudentDto) {
    school_id?: never;
}