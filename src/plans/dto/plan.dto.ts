import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, ValidateNested, IsObject, IsIn } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

class PlanFeaturesDto {
  @IsBoolean()
  canUseLms: boolean;

  @IsNumber()
  maxStudents: number;

  @IsIn(['basic', 'priority'])
  supportLevel: 'basic' | 'priority';

  @IsBoolean()
  canUseAdvancedReports: boolean;
}

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  monthly_price?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  yearly_price?: number;

  @IsObject()
  @ValidateNested()
  @Type(() => PlanFeaturesDto)
  @IsNotEmpty()
  features: PlanFeaturesDto;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}