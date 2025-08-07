import { IsInt, IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ description: 'The ID of the subject this course is based on.' })
  @IsInt() @IsNotEmpty()
  subject_id: number;

  @ApiProperty({ description: 'The ID of the user (teacher) responsible for this course.' })
  @IsInt() @IsNotEmpty()
  teacher_id: number;
  
  @ApiProperty({ description: 'The official title of the course.', example: 'Introduction to Algebra' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'A detailed description of the course content and objectives.', required: false })
  @IsString() @IsOptional()
  description?: string;
  
  @ApiProperty({ description: 'The ID of the academic year this course is offered in.', required: false })
  @IsInt() @IsOptional()
  academic_year_id?: number;
}