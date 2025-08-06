import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, UsePipes, ValidationPipe } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Academics - Assessments')
@Controller('assessments')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new CBC-aligned assessment record' })
  @ApiResponse({ status: 201, description: 'Assessment created successfully.'})
  @ApiResponse({ status: 400, description: 'Bad Request - e.g., student is not enrolled.'})
  @ApiResponse({ status: 403, description: 'Forbidden - Teacher is not authorized to assess this student in this subject.'})
  create(@Body() createDto: CreateAssessmentDto) {
    return this.assessmentsService.create(createDto);
  }

  @Get('reports/class-subject-performance')
  @ApiOperation({ summary: 'Generate a detailed performance report for a subject within a class and term' })
  @ApiQuery({ name: 'classId', type: Number })
  @ApiQuery({ name: 'subjectId', type: Number })
  @ApiQuery({ name: 'termId', type: Number })
  getClassSubjectReport(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('subjectId', ParseIntPipe) subjectId: number,
    @Query('termId', ParseIntPipe) termId: number,
  ) {
    return this.assessmentsService.generateClassSubjectReport(classId, subjectId, termId);
  }

  @Get('history/student-subject')
  @ApiOperation({ summary: "Get a student's full performance history in a subject across all time" })
  @ApiQuery({ name: 'studentId', type: Number })
  @ApiQuery({ name: 'subjectId', type: Number })
  getStudentSubjectHistory(
    @Query('studentId', ParseIntPipe) studentId: number,
    @Query('subjectId', ParseIntPipe) subjectId: number,
  ) {
    return this.assessmentsService.getStudentSubjectHistory(studentId, subjectId);
  }

  @Get('unassessed')
  @ApiOperation({ summary: 'Find students in a class who have not yet been graded for a specific assessment' })
  @ApiQuery({ name: 'classId', type: Number })
  @ApiQuery({ name: 'termId', type: Number })
  @ApiQuery({ name: 'assessmentTitle', type: String, description: "The exact title of the assessment, e.g., 'Mid-Term Exam'" })
  findUnassessedStudents(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('termId', ParseIntPipe) termId: number,
    @Query('assessmentTitle') assessmentTitle: string,
  ) {
    return this.assessmentsService.findUnassessedStudents(classId, termId, assessmentTitle);
  }
  
  @Get('by-teacher')
  @ApiOperation({ summary: 'Get all assessments recorded by a teacher in a term' })
  @ApiQuery({ name: 'teacherId', type: Number })
  @ApiQuery({ name: 'termId', type: Number })
  findAllByTeacher(
    @Query('teacherId', ParseIntPipe) teacherId: number,
    @Query('termId', ParseIntPipe) termId: number,
  ) {
    return this.assessmentsService.findAllByTeacher(teacherId, termId);
  }

  @Get('by-subject')
  @ApiOperation({ summary: 'Get all assessments for a subject in a term' })
  @ApiQuery({ name: 'subjectId', type: Number })
  @ApiQuery({ name: 'termId', type: Number })
  findAllBySubject(
    @Query('subjectId', ParseIntPipe) subjectId: number,
    @Query('termId', ParseIntPipe) termId: number,
  ) {
    return this.assessmentsService.findAllBySubject(subjectId, termId);
  }

  @Get('by-class')
  @ApiOperation({ summary: 'Get all assessments for a class in a term' })
  @ApiQuery({ name: 'classId', type: Number })
  @ApiQuery({ name: 'termId', type: Number })
  findAllByClass(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('termId', ParseIntPipe) termId: number,
  ) {
    return this.assessmentsService.findAllByClass(classId, termId);
  }

  @Get('report-card')
  @ApiOperation({ summary: 'Generate a structured report card for a student in a term' })
  @ApiQuery({ name: 'studentId', type: Number })
  @ApiQuery({ name: 'termId', type: Number })
  generateStudentReportCard(
    @Query('studentId', ParseIntPipe) studentId: number,
    @Query('termId', ParseIntPipe) termId: number,
  ) {
    return this.assessmentsService.generateStudentReportCard(studentId, termId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single assessment by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing assessment record' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateAssessmentDto) {
    return this.assessmentsService.update(id, updateDto);
  }
}