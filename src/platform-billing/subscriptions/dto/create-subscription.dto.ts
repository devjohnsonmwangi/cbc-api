import { IsInt, IsNotEmpty, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { subscriptionStatusEnum } from '../../../drizzle/schema';

export class CreateSubscriptionDto {
  @ApiProperty() @IsInt() @IsNotEmpty()
  school_id: number;

  @ApiProperty() @IsInt() @IsNotEmpty()
  plan_id: number;

  @ApiProperty({ enum: subscriptionStatusEnum.enumValues, default: 'trialing' })
  @IsEnum(subscriptionStatusEnum.enumValues) @IsNotEmpty()
  status: typeof subscriptionStatusEnum.enumValues[number];

  @ApiProperty({ description: 'Start date of the current billing period (YYYY-MM-DD).' })
  @IsDateString() @IsNotEmpty()
  current_period_start: string;

  @ApiProperty({ description: 'End date of the current billing period (YYYY-MM-DD).' })
  @IsDateString() @IsNotEmpty()
  current_period_end: string;

  @ApiProperty({ description: 'End date of the trial period, if applicable (YYYY-MM-DD).', required: false })
  @IsDateString() @IsOptional()
  trial_end_date?: string;
}