import { IsObject, IsOptional, ValidateNested, IsString, IsNotEmpty, IsEnum, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { paymentGatewayEnum } from '../../drizzle/schema';
import { Type } from 'class-transformer';

class MpesaCredentialsDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  consumerKey: string;

  @ApiProperty() @IsString() @IsNotEmpty()
  consumerSecret: string;
  
  @ApiProperty() @IsString() @IsNotEmpty()
  passKey: string;
  
  @ApiProperty() @IsString() @IsNotEmpty()
  shortCode: string;

  @ApiProperty({ enum: ['sandbox', 'live']}) @IsIn(['sandbox', 'live'])
  environment: 'sandbox' | 'live';
}

class StripeCredentialsDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  secretKey: string;

  @ApiProperty() @IsString() @IsNotEmpty()
  webhookSecret: string;
}

export class UpdateConfigurationDto {
  @ApiProperty({ type: MpesaCredentialsDto, required: false })
  @IsObject()
  @ValidateNested()
  @Type(() => MpesaCredentialsDto)
  @IsOptional()
  mpesa_credentials?: MpesaCredentialsDto;

  @ApiProperty({ type: StripeCredentialsDto, required: false })
  @IsObject()
  @ValidateNested()
  @Type(() => StripeCredentialsDto)
  @IsOptional()
  stripe_credentials?: StripeCredentialsDto;
  
  @ApiProperty({ 
    description: 'The default payment gateway for generating invoices.', 
    enum: paymentGatewayEnum.enumValues, 
    required: false 
  })
  @IsEnum(paymentGatewayEnum.enumValues)
  @IsOptional()
  default_payment_gateway?: typeof paymentGatewayEnum.enumValues[number];
}