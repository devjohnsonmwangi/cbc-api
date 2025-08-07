import { IsInt, IsNotEmpty, IsString, IsEnum, IsArray, ValidateNested, IsBoolean, ArrayMinSize, ValidateIf, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { questionTypeEnum } from '../../drizzle/schema';
import { Type } from 'class-transformer';

class CreateOptionDto {
    @ApiProperty() @IsString() @IsNotEmpty()
    option_text: string;

    @ApiProperty({ default: false }) @IsBoolean() @IsNotEmpty()
    is_correct: boolean;
}

export class CreateQuestionDto {
  @ApiProperty() @IsInt() @IsNotEmpty()
  quiz_id: number;

  @ApiProperty() @IsString() @IsNotEmpty()
  question_text: string;

  @ApiProperty({ enum: questionTypeEnum.enumValues })
  @IsEnum(questionTypeEnum.enumValues) @IsNotEmpty()
  question_type: typeof questionTypeEnum.enumValues[number];

  @ApiProperty() @IsInt() @Min(1) @IsNotEmpty()
  order: number;
  
  // Options are only required for multiple_choice type questions
  @ApiProperty({ type: [CreateOptionDto], required: false })
  @ValidateIf(o => o.question_type === 'multiple_choice')
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];
}