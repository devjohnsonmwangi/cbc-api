import { PartialType } from '@nestjs/mapped-types';
import { CreateFeeStructureDto } from './create-fee-structure.dto';

// Academic year and grade level should be immutable for a given fee structure.
// To change those, a new record should be created.
export class UpdateFeeStructureDto extends PartialType(CreateFeeStructureDto) {
    academic_year_id?: never;
    grade_level?: never;
}