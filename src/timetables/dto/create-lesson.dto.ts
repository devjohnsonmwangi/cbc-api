import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLessonDto {
  @ApiProperty({ description: 'The ID of the timetable version this lesson belongs to.' })
  @IsInt()
  @IsNotEmpty()
  timetable_version_id: number;

  @ApiProperty({ description: 'The ID of the time slot for this lesson.' })
  @IsInt()
  @IsNotEmpty()
  slot_id: number;

  @ApiProperty({ description: 'The ID of the class receiving the lesson.' })
  @IsInt()
  @IsNotEmpty()
  class_id: number;

  @ApiProperty({ description: 'The ID of the subject being taught.' })
  @IsInt()
  @IsNotEmpty()
  subject_id: number;

  @ApiProperty({ description: 'The ID of the teacher conducting the lesson.' })
  @IsInt()
  @IsNotEmpty()
  teacher_id: number;

  @ApiProperty({ description: 'The optional ID of the venue for the lesson.', required: false })
  @IsInt()
  @IsOptional()
  venue_id?: number;
}