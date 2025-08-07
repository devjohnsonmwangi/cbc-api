import { IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { subscriptionStatusEnum } from '../../../drizzle/schema';

// A specific DTO for updates. You typically wouldn't change the school or plan,
// but rather the status or billing dates.
export class UpdateSubscriptionDto {
  @ApiProperty({ enum: subscriptionStatusEnum.enumValues, required: false })
  @IsEnum(subscriptionStatusEnum.enumValues) @IsOptional()
  status?: typeof subscriptionStatusEnum.enumValues[number];

  @ApiProperty({ description: 'Start date of the new billing period (YYYY-MM-DD).', required: false })
  @IsDateString() @IsOptional()
  current_period_start?: string;

  @ApiProperty({ description: 'End date of the new billing period (YYYY-MM-DD).', required: false })
  @IsDateString() @IsOptional()
  current_period_end?: string;
  
  @ApiProperty({ description: 'Date the subscription was canceled.', required: false })
  @IsDateString() @IsOptional()
  canceled_at?: string;
}