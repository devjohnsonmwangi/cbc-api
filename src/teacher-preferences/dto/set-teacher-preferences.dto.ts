import { IsInt, IsNotEmpty, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { availabilityStatusEnum } from '../../drizzle/schema';
import { Type } from 'class-transformer';

class PreferenceDto {
  @ApiProperty({ description: 'The unique ID of the timetable slot.' })
  @IsInt()
  @IsNotEmpty()
  slot_id: number;

  @ApiProperty({ 
    description: 'The teacher\'s availability status for this slot.', 
    enum: availabilityStatusEnum.enumValues 
  })
  @IsEnum(availabilityStatusEnum.enumValues)
  @IsNotEmpty()
  status: typeof availabilityStatusEnum.enumValues[number];
}

export class SetTeacherPreferencesDto {
  @ApiProperty({ description: 'The ID of the teacher setting their preferences.' })
  @IsInt()
  @IsNotEmpty()
  teacher_id: number;

  @ApiProperty({ description: 'The ID of the term these preferences apply to.' })
  @IsInt()
  @IsNotEmpty()
  term_id: number;

  @ApiProperty({ 
    type: [PreferenceDto], 
    description: 'An array of preferences for various time slots. Sending an empty array will clear all preferences for the term.' 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceDto)
  preferences: PreferenceDto[];
}