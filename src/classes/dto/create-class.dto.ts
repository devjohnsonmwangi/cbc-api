import { IsString, IsNotEmpty, IsInt, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { gradeLevelEnum } from '../../drizzle/schema';

export class CreateClassDto {
  @ApiProperty({ description: 'The ID of the school this class belongs to.', example: 1 })
  @IsInt()
  @IsNotEmpty()
  school_id: number;

  @ApiProperty({
    description: 'The grade level of the class.',
    enum: gradeLevelEnum.enumValues,
    example: 'grade_1',
  })
  @IsEnum(gradeLevelEnum.enumValues, { message: 'A valid grade level is required.' })
  @IsNotEmpty()
  grade_level: typeof gradeLevelEnum.enumValues[number];

  @ApiProperty({
    description: 'The stream or section name of the class (e.g., "A", "Blue"). Can be an empty string if not applicable.',
    example: 'A',
    required: false,
  })
  @IsString()
  @IsOptional()
  stream_name?: string;

  @ApiProperty({
    description: 'The user ID of the teacher assigned as the class teacher.',
    example: 15,
    required: false,
  })
  @IsInt()
  @IsOptional()
  class_teacher_id?: number;
}