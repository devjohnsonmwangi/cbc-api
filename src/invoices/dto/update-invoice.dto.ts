import { IsString, IsDecimal, IsDateString, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { paymentStatusEnum } from '../../drizzle/schema';

// An update DTO is specific because student and term should not be changed.
// Amount paid is updated by the system via payments, not directly by an admin.
export class UpdateInvoiceDto {
  @ApiProperty({ description: 'The updated amount due for this invoice.', example: '55000.00', required: false })
  @IsDecimal({ decimal_digits: '2' }) @IsOptional()
  amount_due?: string;

  @ApiProperty({ description: 'The updated due date for the invoice payment.', required: false })
  @IsDateString() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsOptional()
  due_date?: string;

  @ApiProperty({ 
    description: 'Manually override the status of the invoice.', 
    enum: paymentStatusEnum.enumValues, 
    required: false 
  })
  @IsEnum(paymentStatusEnum.enumValues) @IsOptional()
  status?: typeof paymentStatusEnum.enumValues[number];
  
  @ApiProperty({ description: 'Updated notes for the invoice.', required: false })
  @IsString() @IsOptional()
  notes?: string;
}