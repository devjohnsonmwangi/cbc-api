import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { platformInvoiceStatusEnum } from '../../../drizzle/schema';

// Admins would typically only update the status of a platform invoice manually.
export class UpdatePlatformInvoiceDto {
  @ApiProperty({ 
    description: 'Manually override the status of the invoice.', 
    enum: platformInvoiceStatusEnum.enumValues, 
    required: false 
  })
  @IsEnum(platformInvoiceStatusEnum.enumValues) @IsOptional()
  status?: typeof platformInvoiceStatusEnum.enumValues[number];
}