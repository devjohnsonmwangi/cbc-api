import { IsInt, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { enrollmentStatusEnum } from '../../drizzle/schema';

export class CreateEnrollmentDto {
  @ApiProperty({ description: 'The ID of the student being enrolled.', example: 101 })
  @IsInt()
  @IsNotEmpty()
  student_id: number;

  @ApiProperty({ description: 'The ID of the class the student is being enrolled into.', example: 1 })
  @IsInt()
  @IsNotEmpty()
  class_id: number;

  @ApiProperty({ description: 'The ID of the academic year for this enrollment.', example: 2 })
  @IsInt()
  @IsNotEmpty()
  academic_year_id: number;

  @ApiProperty({
    description: 'The status of the enrollment.',
    enum: enrollmentStatusEnum.enumValues,
    example: 'active',
    required: false,
    default: 'active',
  })
  @IsEnum(enrollmentStatusEnum.enumValues)
  @IsOptional()
  status?: typeof enrollmentStatusEnum.enumValues[number];
}