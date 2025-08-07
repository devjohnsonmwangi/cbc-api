import { IsInt, IsNotEmpty, IsString, IsDecimal, IsDateString, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'The ID of the student being invoiced.' })
  @IsInt() @IsNotEmpty()
  student_id: number;

  @ApiProperty({ description: 'The ID of the term this invoice applies to.' })
  @IsInt() @IsNotEmpty()
  term_id: number;

  @ApiProperty({ description: 'The amount due for this invoice.', example: '50000.00' })
  @IsDecimal({ decimal_digits: '2' }) @IsNotEmpty()
  amount_due: string;

  @ApiProperty({ description: 'The due date for the invoice payment in YYYY-MM-DD format.' })
  @IsDateString() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsNotEmpty()
  due_date: string;
  
  @ApiProperty({ description: 'Optional notes for the invoice.', required: false })
  @IsString() @IsOptional()
  notes?: string;
}