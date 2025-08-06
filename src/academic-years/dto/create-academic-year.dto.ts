import { IsString, IsNotEmpty, IsDateString, IsInt, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAcademicYearDto {
  @ApiProperty({
    description: 'The unique identifier of the school this academic year belongs to.',
    example: 1,
  })
  @IsInt({ message: 'School ID must be an integer.' })
  @IsNotEmpty({ message: 'School ID is required.' })
  school_id: number;

  @ApiProperty({
    description: 'The display name for the academic year (e.g., "2024-2025").',
    example: '2024-2025',
  })
  @IsString()
  @IsNotEmpty({ message: 'Year name cannot be empty.' })
  year_name: string;

  @ApiProperty({
    description: 'The start date of the academic year in ISO 8601 format (YYYY-MM-DD).',
    example: '2024-09-01',
  })
  @IsDateString({}, { message: 'Start date must be a valid date in YYYY-MM-DD format.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Start date must be in YYYY-MM-DD format.' })
  @IsNotEmpty({ message: 'Start date is required.' })
  start_date: string;

  @ApiProperty({
    description: 'The end date of the academic year in ISO 8601 format (YYYY-MM-DD).',
    example: '2025-06-30',
  })
  @IsDateString({}, { message: 'End date must be a valid date in YYYY-MM-DD format.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'End date must be in YYYY-MM-DD format.' })
  @IsNotEmpty({ message: 'End date is required.' })
  end_date: string;
}