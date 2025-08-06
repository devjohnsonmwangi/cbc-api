import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherAssignmentDto } from './create-teacher-assignment.dto';

// Typically, an assignment is either deleted and recreated or not updated.
// But we can allow partial updates if needed, e.g., changing the teacher for a subject/class.
export class UpdateTeacherAssignmentDto extends PartialType(CreateTeacherAssignmentDto) {}