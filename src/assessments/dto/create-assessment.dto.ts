import { IsInt, IsNotEmpty, IsOptional, IsEnum, IsString, IsDecimal, IsDateString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { assessmentTypeEnum } from '../../drizzle/schema';

export class CreateAssessmentDto {
  @ApiProperty({ description: 'ID of the term this assessment belongs to.', example: 3 })
  @IsInt() @IsNotEmpty()
  term_id: number;

  @ApiProperty({ description: 'ID of the student being assessed.', example: 101 })
  @IsInt() @IsNotEmpty()
  student_id: number;

  @ApiProperty({ description: 'ID of the subject for this assessment.', example: 4 })
  @IsInt() @IsNotEmpty()
  subject_id: number;

  @ApiProperty({ description: 'ID of the teacher who recorded the assessment.', example: 15 })
  @IsInt() @IsNotEmpty()
  teacher_id: number;

  @ApiProperty({ description: 'The type of assessment.', enum: assessmentTypeEnum.enumValues, example: 'formative' })
  @IsEnum(assessmentTypeEnum.enumValues) @IsNotEmpty()
  assessment_type: typeof assessmentTypeEnum.enumValues[number];

  @ApiProperty({ description: 'Title of the assessment (e.g., "End of Term Exam").', required: false, maxLength: 255 })
  @IsString() @MaxLength(255) @IsOptional()
  assessment_title?: string;

  @ApiProperty({ description: 'The CBC Strand being assessed.', example: 'Numbers', required: false })
  @IsString() @IsOptional() @MaxLength(255)
  strand?: string;

  @ApiProperty({ description: 'The CBC Sub-Strand being assessed.', example: 'Whole Numbers', required: false })
  @IsString() @IsOptional() @MaxLength(255)
  sub_strand?: string;

  @ApiProperty({ description: 'The specific learning outcome targeted by this assessment.', required: false })
  @IsString() @IsOptional()
  learning_outcome?: string;

  @ApiProperty({ description: 'The performance level achieved by the student.', example: 'Meets Expectation', required: false })
  @IsString() @IsOptional() @MaxLength(50)
  performance_level?: string;

  @ApiProperty({ description: 'The numerical score achieved, if applicable.', example: '85.50', required: false })
  @IsDecimal({ decimal_digits: '2' }, { message: 'Score must be a valid number with up to 2 decimal places.' })
  @IsOptional()
  score?: string;

  @ApiProperty({ description: 'Teacher\'s qualitative comments about the student\'s performance.', required: false })
  @IsString() @IsOptional()
  teacher_comments?: string;

  @ApiProperty({ description: 'The date the assessment was conducted.', example: '2024-11-25', required: false })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Assessment date must be in YYYY-MM-DD format.' })
  @IsOptional()
  assessment_date?: string;
}