import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ description: 'The ID of the school this subject belongs to.', example: 1 })
  @IsInt()
  @IsNotEmpty()
  school_id: number;

  @ApiProperty({ description: 'The full name of the subject.', example: 'Mathematics' })
  @IsString()
  @IsNotEmpty()
  subject_name: string;

  @ApiProperty({
    description: 'An optional code for the subject (e.g., "MATH101").',
    example: 'MATH101',
    required: false,
  })
  @IsString()
  @IsOptional()
  subject_code?: string;
}