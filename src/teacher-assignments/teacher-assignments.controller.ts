import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { CreateTeacherAssignmentDto } from './dto/create-teacher-assignment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Academics - Teacher Assignments')
@Controller('teacher-assignments')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class TeacherAssignmentsController {
  constructor(private readonly assignmentsService: TeacherAssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Assign a teacher to a subject in a specific class' })
  @ApiResponse({ status: 201, description: 'Assignment created successfully.'})
  @ApiResponse({ status: 400, description: 'Bad Request - e.g., user is not a teacher.'})
  @ApiResponse({ status: 409, description: 'Conflict - This exact assignment already exists.'})
  create(@Body() createDto: CreateTeacherAssignmentDto) {
    return this.assignmentsService.create(createDto);
  }
  
  @Get(':id')
  @ApiOperation({ summary: 'Get a single assignment by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assignmentsService.findOne(id);
  }

  @Get('by-teacher/:teacherId')
  @ApiOperation({ summary: 'Get all assignments for a specific teacher' })
  findAllByTeacher(@Param('teacherId', ParseIntPipe) teacherId: number) {
    return this.assignmentsService.findAllByTeacher(teacherId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a teacher assignment' })
  @HttpCode(HttpStatus.OK)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.assignmentsService.delete(id);
  }
}