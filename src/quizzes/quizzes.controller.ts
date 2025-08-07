import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('LMS - Quizzes')
@Controller('quizzes')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // --- Quiz & Question Management ---
  @Post()
  @ApiOperation({ summary: 'Create a new quiz container (linked to a lesson content item)' })
  createQuiz(@Body() createDto: CreateQuizDto) {
    return this.quizzesService.createQuiz(createDto);
  }

  @Post('questions')
  @ApiOperation({ summary: 'Add a new question to an existing quiz' })
  addQuestionToQuiz(@Body() createDto: CreateQuestionDto) {
      return this.quizzesService.addQuestionToQuiz(createDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single quiz with its full structure (questions and options)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quizzesService.findOne(id);
  }

  // --- Student Attempt Flow ---
  @Post(':id/start-attempt')
  @ApiOperation({ summary: 'Start a quiz attempt for a student' })
  @ApiBody({ schema: { type: 'object', properties: { student_id: { type: 'number' } } } })
  startQuizAttempt(
    @Param('id', ParseIntPipe) id: number,
    @Body('student_id', ParseIntPipe) studentId: number
  ) {
    return this.quizzesService.startQuizAttempt(id, studentId);
  }

  @Post('attempts/:id/submit')
  @ApiOperation({ summary: 'Submit answers for an ongoing quiz attempt' })
  submitQuizAnswers(
    @Param('id', ParseIntPipe) id: number,
    @Body() submission: SubmitAnswersDto
  ) {
    return this.quizzesService.submitQuizAnswers(id, submission);
  }

  @Get('attempts/:id/result')
  @ApiOperation({ summary: 'Get the detailed result of a completed quiz attempt' })
  getAttemptResult(@Param('id', ParseIntPipe) id: number) {
    return this.quizzesService.getAttemptResult(id);
  }
}