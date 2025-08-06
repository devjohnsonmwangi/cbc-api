import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVenueDto {
  @ApiProperty({
    description: 'The ID of the school this venue belongs to.',
    example: 1
  })
  @IsInt()
  @IsNotEmpty()
  school_id: number;

  @ApiProperty({
    description: 'The name of the venue (e.g., "Main Hall", "Physics Lab", "Sports Field").',
    example: 'Physics Lab'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The maximum number of people the venue can hold.',
    example: 30,
    required: false
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  capacity?: number;
}