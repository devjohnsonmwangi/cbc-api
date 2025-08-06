import { IsInt, IsNotEmpty, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { subscriptionStatusEnum } from '../../drizzle/schema';
import { PartialType } from '@nestjs/mapped-types';

export class CreateSubscriptionDto {
  @IsInt()
  @IsNotEmpty()
  school_id: number;

  @IsInt()
  @IsNotEmpty()
  plan_id: number;

  @IsEnum(subscriptionStatusEnum.enumValues)
  @IsNotEmpty()
  status: typeof subscriptionStatusEnum.enumValues[number];

  @IsDateString()
  @IsNotEmpty()
  current_period_start: string;

  @IsDateString()
  @IsNotEmpty()
  current_period_end: string;

  @IsDateString()
  @IsOptional()
  trial_end_date?: string;

  @IsDateString()
  @IsOptional()
  canceled_at?: string;
}

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {}