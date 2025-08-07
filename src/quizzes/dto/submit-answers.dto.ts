import { IsInt, IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class AnswerDto {
    @ApiProperty() @IsInt() @IsNotEmpty()
    question_id: number;

    @ApiProperty({ description: "The student's selected option ID (for multiple_choice).", required: false })
    @IsInt() @IsOptional()
    selected_option_id?: number;

    @ApiProperty({ description: "The student's written answer (for short_answer/true_false).", required: false })
    @IsString() @IsOptional()
    answer_text?: string;
}

export class SubmitAnswersDto {
    @ApiProperty({ type: [AnswerDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AnswerDto)
    answers: AnswerDto[];
}