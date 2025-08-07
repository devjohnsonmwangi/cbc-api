import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, ValidateNested, IsObject, IsIn, Min, IsDecimal } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class PlanFeaturesDto {
  @ApiProperty() @IsBoolean()
  canUseLms: boolean;

  @ApiProperty() @IsNumber() @Min(0)
  maxStudents: number;

  @ApiProperty({ enum: ['basic', 'priority']}) @IsIn(['basic', 'priority'])
  supportLevel: 'basic' | 'priority';

  @ApiProperty() @IsBoolean()
  canUseAdvancedReports: boolean;
}

export class CreatePlanDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false }) @IsString() @IsOptional()
  description?: string;

  @ApiProperty({ type: 'string', example: '100.00', required: false })
  @IsDecimal({ decimal_digits: '2' }) @IsOptional()
  monthly_price?: string;

  @ApiProperty({ type: 'string', example: '1000.00', required: false })
  @IsDecimal({ decimal_digits: '2' }) @IsOptional()
  yearly_price?: string;

  @ApiProperty()
  @IsObject() @ValidateNested() @Type(() => PlanFeaturesDto)
  features: PlanFeaturesDto;

  @ApiProperty({ default: true, required: false })
  @IsBoolean() @IsOptional()
  is_active?: boolean;
}