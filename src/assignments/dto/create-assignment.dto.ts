import { IsInt, IsNotEmpty, IsString, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({ 
    description: 'The ID of the "lessonContent" item that this assignment is linked to. The content_type of this item must be "assignment".' 
  })
  @IsInt() @IsNotEmpty()
  content_id: number;

  @ApiProperty({ description: 'Detailed instructions for the assignment.' })
  @IsString() @IsNotEmpty()
  instructions: string;

  @ApiProperty({ description: 'The due date for the assignment in ISO 8601 format.', required: false })
  @IsDateString() @IsOptional()
  due_date?: string;

  @ApiProperty({ description: 'The maximum points or score for this assignment.', example: 100, required: false })
  @IsInt() @Min(0) @IsOptional()
  max_points?: number;
}