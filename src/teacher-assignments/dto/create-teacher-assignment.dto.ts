import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeacherAssignmentDto {
  @ApiProperty({ description: 'The ID of the user (who must be a teacher).', example: 15 })
  @IsInt()
  @IsNotEmpty()
  teacher_id: number;

  @ApiProperty({ description: 'The ID of the subject being assigned.', example: 4 })
  @IsInt()
  @IsNotEmpty()
  subject_id: number;

  @ApiProperty({ description: 'The ID of the class this assignment applies to.', example: 1 })
  @IsInt()
  @IsNotEmpty()
  class_id: number;
}