import { IsDecimal, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GradeSubmissionDto {
  @ApiProperty({ description: 'The grade awarded to the submission.', example: '88.50' })
  @IsDecimal({ decimal_digits: '2' })
  @IsNotEmpty()
  grade: string;

  @ApiProperty({ description: 'Qualitative feedback from the teacher for the student.', required: false })
  @IsString() @IsOptional()
  feedback?: string;
}