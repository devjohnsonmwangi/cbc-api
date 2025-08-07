import { IsInt, IsNotEmpty, IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { timetableTypeEnum } from '../../drizzle/schema';

export class CreateTimetableVersionDto {
  @ApiProperty({ description: 'The ID of the term this timetable version belongs to.' })
  @IsInt()
  @IsNotEmpty()
  term_id: number;

  @ApiProperty({ description: 'The unique name for this timetable version (e.g., "Term 1 2024 - Final").' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'An optional description for this version.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The type of timetable (for lessons, exams, or other events).',
    enum: timetableTypeEnum.enumValues,
    required: false,
    default: 'lesson'
  })
  @IsEnum(timetableTypeEnum.enumValues)
  @IsOptional()
  timetable_type?: typeof timetableTypeEnum.enumValues[number];
}