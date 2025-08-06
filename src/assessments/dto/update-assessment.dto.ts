import { PartialType } from '@nestjs/mapped-types';
import { CreateAssessmentDto } from './create-assessment.dto';

export class UpdateAssessmentDto extends PartialType(CreateAssessmentDto) {
    student_id?: never;
    subject_id?: never;
    term_id?: never;
    teacher_id?: never;
}