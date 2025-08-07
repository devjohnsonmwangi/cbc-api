import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('LMS - Assignments & Submissions')
@Controller('assignments')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // --- Assignment Endpoints ---

  @Post()
  @ApiOperation({ summary: 'Create a new assignment (linked to a lesson content item)' })
  create(@Body() createDto: CreateAssignmentDto) {
    return this.assignmentsService.create(createDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single assignment with all its submissions' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assignmentsService.findOne(id);
  }

  // --- Submission Endpoints ---

  @Post('submissions')
  @ApiOperation({ summary: 'Submit a student\'s work for an assignment' })
  createSubmission(@Body() createDto: CreateSubmissionDto) {
    return this.assignmentsService.createSubmission(createDto);
  }

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Get a single student submission by its ID' })
  findOneSubmission(@Param('id', ParseIntPipe) id: number) {
      return this.assignmentsService.findOneSubmission(id);
  }

  @Patch('submissions/:id/grade')
  @ApiOperation({ summary: 'Grade a student submission' })
  gradeSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Body() gradeDto: GradeSubmissionDto
  ) {
    return this.assignmentsService.gradeSubmission(id, gradeDto);
  }
}