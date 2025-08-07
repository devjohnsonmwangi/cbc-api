import { ApiProperty, PartialType } from '@nestjs/swagger'; // PartialType is for updates
import { IsString, MinLength, MaxLength, IsEnum, IsArray, IsOptional, IsISO8601, ValidateIf, IsNotEmpty } from 'class-validator';
import { announcementAudienceEnum, announcementChannelEnum } from '../../../drizzle/schema';

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'The title of the announcement.', minLength: 3, maxLength: 255 })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'The main content/body of the announcement.' })
  @IsString()
  @MinLength(10)
  body: string;

  @ApiProperty({ description: 'The target audience for the announcement.', enum: announcementAudienceEnum.enumValues })
  @IsEnum(announcementAudienceEnum.enumValues)
  audience_type: typeof announcementAudienceEnum.enumValues[number];

  @ApiProperty({ 
    description: 'Specifies the target audience further (e.g., an array of role names or class IDs). Required for specific audience types.',
    required: false 
  })
  @IsOptional()
  @ValidateIf(o => ['specific_roles', 'specific_grades', 'specific_classes', 'specific_groups', 'specific_users'].includes(o.audience_type))
  @IsNotEmpty({ message: 'Audience specifier cannot be empty for the selected audience type.' })
  audience_specifier: any; // Can be string[], number[], etc. Further validation can be added if needed.

  @ApiProperty({ description: 'The channels through which the announcement will be sent.', enum: announcementChannelEnum.enumValues, isArray: true })
  @IsArray()
  @IsEnum(announcementChannelEnum.enumValues, { each: true })
  channels: (typeof announcementChannelEnum.enumValues[number])[];

  @ApiProperty({ description: 'The scheduled time for sending the announcement (ISO 8601 format). Sends immediately if omitted.', required: false })
  @IsOptional()
  @IsISO8601()
  scheduled_for?: string;
}

// The Update DTO uses all the properties of the Create DTO, but marks them all as optional.
export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}