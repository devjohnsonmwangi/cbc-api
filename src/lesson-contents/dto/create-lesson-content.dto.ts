import { IsInt, IsNotEmpty, IsString, IsEnum, IsUrl, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { contentTypeEnum } from '../../drizzle/schema';

export class CreateLessonContentDto {
  @ApiProperty({ description: 'The ID of the parent course module this content belongs to.' })
  @IsInt() @IsNotEmpty()
  module_id: number;

  @ApiProperty({ description: 'The title of the content item.', example: 'Video: Introduction to Variables' })
  @IsString() @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'The type of content.', enum: contentTypeEnum.enumValues })
  @IsEnum(contentTypeEnum.enumValues) @IsNotEmpty()
  content_type: typeof contentTypeEnum.enumValues[number];

  @ApiProperty({ description: 'A URL pointing to the content (e.g., video link, PDF URL). Required for non-text types.', required: false })
  @IsUrl() @IsOptional()
  content_url?: string;

  @ApiProperty({ description: 'The actual text content for text-based lessons.', required: false })
  @IsString() @IsOptional()
  content_text?: string;
  
  @ApiProperty({ description: 'The display order of this content within the module.', example: 1 })
  @IsInt() @Min(1) @IsNotEmpty()
  order: number;
}