// developed    with  NestJS, TypeScript, and class-validator
// developed  by   senior  developer   Eng Johnson Mwangi
// this   code  is  part  of  a  school management system API
// this   file defines the Data Transfer Objects (DTOs) for the Event Reminders module
// any  issues  or   bugs  should    be  reported  to   the   developer  team:  senior developer Eng Johnson Mwangi
// my   email: johnsonthuraniramwangi@gmail.com
// or our   developer  team email: jomulimited2@gmail.com

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsEnum, IsArray, ArrayNotEmpty } from 'class-validator';
import { announcementChannelEnum } from '../../../drizzle/schema';

/**
 * Defines the data structure and validation rules for creating a new reminder for an event.
 * This DTO is used to validate the body of a POST request to /events/:eventId/reminders.
 */
export class CreateEventReminderDto {
  @ApiProperty({
    description: 'The number of minutes before the event start time that the reminder should be sent.',
    example: 60, // e.g., 60 minutes before
  })
  @IsInt()
  @Min(1, { message: 'The reminder must be set for at least 1 minute before the event.' })
  readonly minutes_before: number;

  @ApiProperty({
    description: 'An array of channels through which the reminder should be delivered.',
    enum: announcementChannelEnum.enumValues,
    isArray: true,
    example: ['dashboard', 'sms'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(announcementChannelEnum.enumValues, { each: true })
  readonly channels: (typeof announcementChannelEnum.enumValues)[number][];
}