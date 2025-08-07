import { IsInt, IsNotEmpty, IsDecimal, IsDateString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlatformInvoiceDto {
  @ApiProperty({ description: 'The ID of the subscription this invoice is for.' })
  @IsInt() @IsNotEmpty()
  subscription_id: number;

  @ApiProperty({ description: 'The amount due for this billing period.', example: '1000.00' })
  @IsDecimal({ decimal_digits: '2' }) @IsNotEmpty()
  amount_due: string;

  @ApiProperty({ description: 'The date the payment is due (YYYY-MM-DD).' })
  @IsDateString() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsNotEmpty()
  due_date: string;
  
  @ApiProperty({ description: 'The start of the service period this invoice covers (YYYY-MM-DD).' })
  @IsDateString() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsNotEmpty()
  period_start: string;
  
  @ApiProperty({ description: 'The end of the service period this invoice covers (YYYY-MM-DD).' })
  @IsDateString() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsNotEmpty()
  period_end: string;
}