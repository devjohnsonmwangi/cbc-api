import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('LMS - Courses')
@Controller('courses')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new e-learning course' })
  @ApiResponse({ status: 201, description: 'Course created successfully.'})
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid reference IDs provided.'})
  @ApiResponse({ status: 409, description: 'A course with this title already exists for this subject/year.'})
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Get('by-teacher/:teacherId')
  @ApiOperation({ summary: 'Get all courses managed by a specific teacher' })
  findAllByTeacher(@Param('teacherId', ParseIntPipe) teacherId: number) {
    return this.coursesService.findAllByTeacher(teacherId);
  }
  
  @Get('by-subject/:subjectId')
  @ApiOperation({ summary: 'Get all courses related to a specific subject' })
  findAllBySubject(@Param('subjectId', ParseIntPipe) subjectId: number) {
    return this.coursesService.findAllBySubject(subjectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single course with its full structure (modules and content)' })
  @ApiResponse({ status: 200, description: 'The complete course object.'})
  @ApiResponse({ status: 404, description: 'Course not found.'})
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing course' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a course' })
  @HttpCode(HttpStatus.OK)
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.archive(id);
  }
}