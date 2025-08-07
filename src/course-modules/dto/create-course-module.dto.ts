import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseModuleDto {
  @ApiProperty({ description: 'The ID of the parent course this module belongs to.' })
  @IsInt()
  @IsNotEmpty()
  course_id: number;

  @ApiProperty({ description: 'The title of the module.', example: 'Chapter 1: Foundations of Algebra' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'The display order of this module within the course.', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  order: number;
}