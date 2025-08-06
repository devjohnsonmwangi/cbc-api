import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkParentDto {
  @ApiProperty({ description: 'The user ID of the parent.', example: 25 })
  @IsInt()
  @IsNotEmpty()
  parent_user_id: number;
}