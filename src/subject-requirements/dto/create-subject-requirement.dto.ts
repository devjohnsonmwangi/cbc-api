import { IsInt, IsNotEmpty, IsOptional, IsString, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectRequirementDto {
  @ApiProperty({ description: 'The ID of the term these requirements apply to.' })
  @IsInt() @IsNotEmpty()
  term_id: number;

  @ApiProperty({ description: 'The ID of the class these requirements are for.' })
  @IsInt() @IsNotEmpty()
  class_id: number;

  @ApiProperty({ description: 'The ID of the subject.' })
  @IsInt() @IsNotEmpty()
  subject_id: number;

  @ApiProperty({ description: 'The required number of lessons for this subject per week.', example: 5 })
  @IsInt() @Min(1) @IsNotEmpty()
  lessons_per_week: number;

  @ApiProperty({ 
    description: 'An optional tag for required venue type (e.g., "lab", "gym"). Must match a venue\'s type.', 
    required: false 
  })
  @IsString() @IsOptional()
  requires_specific_venue_type?: string;

  @ApiProperty({ 
    description: 'Specifies if this subject should be scheduled as a double period.', 
    default: false, 
    required: false 
  })
  @IsBoolean() @IsOptional()
  is_double_period?: boolean;
}