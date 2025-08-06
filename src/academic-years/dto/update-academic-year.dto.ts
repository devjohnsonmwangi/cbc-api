import { PartialType } from '@nestjs/mapped-types';
import { CreateAcademicYearDto } from './create-academic-year.dto';

/**
 * UpdateAcademicYearDto uses PartialType to make all properties of CreateAcademicYearDto optional.
 * This is ideal for PATCH requests, as it allows clients to send only the fields they want to change.
 * It automatically inherits all validation decorators from the base DTO.
 */
export class UpdateAcademicYearDto extends PartialType(CreateAcademicYearDto) {}