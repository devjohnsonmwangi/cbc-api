import { IsInt, IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkProgressDto {
  @ApiProperty({ description: 'The ID of the student whose progress is being marked.' })
  @IsInt() @IsNotEmpty()
  student_id: number;

  @ApiProperty({ description: 'Whether the content is being marked as completed or not.', default: true })
  @IsBoolean() @IsNotEmpty()
  is_completed: boolean;
}