// developed    with  NestJS, TypeScript, and class-validator
// developed  by   senior  developer   Eng Johnson Mwangi
// this   code  is  part  of  a  school management system API
// this   file defines the Data Transfer Objects (DTOs) for the Announcements module
// any  issues  or   bugs  should    be  reported  to   the   developer  team:  senior developer Eng Johnson Mwangi
// my   email: johnsonthuraniramwangi@gmail.com
// or our   developer  team email: jomulimited2@gmail.com

import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsArray,
  IsOptional,
  IsISO8601,
  ValidateIf,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer'; // Required for transforming query parameters
import { announcementAudienceEnum, announcementChannelEnum } from '../../../drizzle/schema';

/**
 * Defines the data structure and validation rules for creating a new school announcement.
 * This DTO is used to validate the body of a POST request to /announcements.
 */
export class CreateAnnouncementDto {
  @ApiProperty({
    description: 'The main title of the announcement. Must be between 3 and 255 characters.',
    example: 'Upcoming Sports Day Schedule',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  readonly title: string;

  @ApiProperty({
    description: 'The full content/body of the announcement. Can be plain text or markdown.',
    example: 'Dear all, the annual sports day will be held on the 20th of next month. All students are requested to register for their preferred events.',
  })
  @IsString()
  @MinLength(10)
  readonly body: string;

  @ApiProperty({
    description: 'Defines the primary target audience for this announcement. This determines who will receive it.',
    enum: announcementAudienceEnum.enumValues,
    example: 'all_parents',
  })
  @IsEnum(announcementAudienceEnum.enumValues)
  readonly audience_type: (typeof announcementAudienceEnum.enumValues)[number];

  @ApiProperty({
    description: 'Provides specific details for the chosen audience type. For example, an array of role names `["teacher"]` or an array of class IDs `[10, 12]`. This is required for any `specific_*` audience type.',
    required: false,
    example: ['grade_7', 'grade_8'],
  })
  @IsOptional()
  @ValidateIf((object) => object.audience_type.startsWith('specific_'))
  @IsNotEmpty({ message: 'Audience specifier cannot be empty when a specific audience type is chosen.' })
  @IsArray() // Ensure it's an array for specific targets
  readonly audience_specifier: string[] | number[];

  @ApiProperty({
    description: 'An array of channels through which the announcement should be delivered (e.g., in-app dashboard, email).',
    enum: announcementChannelEnum.enumValues,
    isArray: true,
    example: ['dashboard', 'email'],
  })
  @IsArray()
  @IsEnum(announcementChannelEnum.enumValues, { each: true })
  readonly channels: (typeof announcementChannelEnum.enumValues)[number][];

  @ApiProperty({
    description: 'The scheduled time for sending the announcement in ISO 8601 format. If omitted, the announcement is considered to be sent immediately.',
    required: false,
    example: '2025-11-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  readonly scheduled_for?: string;
}

/**
 * Defines the data structure for updating an existing announcement.
 * It inherits all properties and validation rules from CreateAnnouncementDto
 * but makes every property optional, allowing for partial updates.
 * For example, a user can update only the title without providing the body again.
 */
export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}

/**
 * Defines the data structure and validation rules for query parameters
 * used when fetching a paginated list of announcement receipts.
 */
export class GetReceiptsQueryDto {
  @ApiProperty({
    description: 'The page number to retrieve for pagination.',
    required: false,
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number) // This ensures the string from the URL query is transformed into a number
  @IsInt()
  @Min(1)
  readonly page: number = 1;

  @ApiProperty({
    description: 'The number of items to return per page. Maximum is 100.',
    required: false,
    default: 20,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number) // This ensures the string from the URL query is transformed into a number
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit: number = 20;
}