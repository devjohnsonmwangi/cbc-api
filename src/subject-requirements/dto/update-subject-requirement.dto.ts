import { PartialType } from '@nestjs/mapped-types';
import { CreateSubjectRequirementDto } from './create-subject-requirement.dto';

// Term, Class, and Subject should be immutable. Only the requirements can change.
export class UpdateSubjectRequirementDto extends PartialType(CreateSubjectRequirementDto) {
    term_id?: never;
    class_id?: never;
    subject_id?: never;
}