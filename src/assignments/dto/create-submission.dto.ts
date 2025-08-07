import { IsInt, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({ description: 'The ID of the assignment being submitted to.' })
  @IsInt() @IsNotEmpty()
  assignment_id: number;

  @ApiProperty({ description: 'The ID of the student making the submission.' })
  @IsInt() @IsNotEmpty()
  student_id: number;

  @ApiProperty({ description: 'A URL pointing to the submitted file (e.g., Google Doc, PDF uploaded to S3).' })
  @IsUrl() @IsNotEmpty()
  submission_url: string;
}