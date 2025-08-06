import { IsString, IsNotEmpty, IsInt, IsOptional, IsEnum, IsDateString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { genderEnum } from '../../drizzle/schema';

export class CreateStudentDto {
  @ApiProperty({ description: 'The ID of the school this student belongs to.', example: 1 })
  @IsInt()
  @IsNotEmpty()
  school_id: number;
  
  @ApiProperty({
    description: "The student's unique admission number within the school.",
    example: 'ADM-2024-0123',
  })
  @IsString()
  @IsNotEmpty()
  admission_number: string;

  @ApiProperty({
    description: "The student's unique personal identifier (UPI), if available.",
    example: 'XYZ123ABC',
    required: false,
  })
  @IsString()
  @IsOptional()
  upi?: string;

  @ApiProperty({
    description: 'The optional user ID for the student\'s portal account.',
    example: 42,
    required: false,
  })
  @IsInt()
  @IsOptional()
  user_id?: number;

  @ApiProperty({
    description: 'The student\'s date of birth in YYYY-MM-DD format.',
    example: '2015-05-20',
    required: false,
  })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date of birth must be in YYYY-MM-DD format.' })
  @IsOptional()
  date_of_birth?: string;

  @ApiProperty({
    description: 'The gender of the student.',
    enum: genderEnum.enumValues,
    example: 'female',
    required: false,
  })
  @IsEnum(genderEnum.enumValues)
  @IsOptional()
  gender?: typeof genderEnum.enumValues[number];
}