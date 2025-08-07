import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuizDto {
  @ApiProperty({ 
    description: 'The ID of the "lessonContent" item this quiz is linked to. The content_type must be "quiz".' 
  })
  @IsInt() @IsNotEmpty()
  content_id: number;

  @ApiProperty({ description: 'The time limit for the quiz in minutes. 0 or null for no limit.', required: false })
  @IsInt() @Min(0) @IsOptional()
  time_limit_minutes?: number;
}