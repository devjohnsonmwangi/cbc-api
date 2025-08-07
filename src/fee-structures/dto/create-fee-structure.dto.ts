import { IsInt, IsNotEmpty, IsString, IsDecimal, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { gradeLevelEnum } from '../../drizzle/schema';

export class CreateFeeStructureDto {
  @ApiProperty({ description: 'The ID of the academic year this fee structure applies to.' })
  @IsInt() @IsNotEmpty()
  academic_year_id: number;

  @ApiProperty({ 
    description: 'The grade level this fee structure applies to.',
    enum: gradeLevelEnum.enumValues
  })
  @IsEnum(gradeLevelEnum.enumValues) @IsNotEmpty()
  grade_level: typeof gradeLevelEnum.enumValues[number];

  @ApiProperty({ description: 'A description of the fee structure (e.g., "Annual Fees for Grade 1").' })
  @IsString() @IsNotEmpty()
  description: string;

  @ApiProperty({ 
    description: 'The total amount due for this grade level in this academic year.',
    example: '150000.00'
  })
  @IsDecimal({ decimal_digits: '2' })
  @IsNotEmpty()
  total_amount: string;
}