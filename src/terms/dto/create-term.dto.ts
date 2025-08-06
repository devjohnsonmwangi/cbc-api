import { IsString, IsNotEmpty, IsDateString, IsInt, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTermDto {
  @ApiProperty({
    description: 'The ID of the parent Academic Year this term belongs to.',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  academic_year_id: number;

  @ApiProperty({
    description: 'The name of the term (e.g., "Term 1", "First Semester").',
    example: 'Term 1',
  })
  @IsString()
  @IsNotEmpty()
  term_name: string;

  @ApiProperty({
    description: 'The start date of the term in YYYY-MM-DD format.',
    example: '2024-09-01',
  })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Start date must be in YYYY-MM-DD format.' })
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({
    description: 'The end date of the term in YYYY-MM-DD format.',
    example: '2024-12-20',
  })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'End date must be in YYYY-MM-DD format.' })
  @IsNotEmpty()
  end_date: string;
}