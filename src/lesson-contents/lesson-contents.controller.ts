import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { LessonContentsService } from './lesson-contents.service';
import { CreateLessonContentDto } from './dto/create-lesson-content.dto';
import { UpdateLessonContentDto } from './dto/update-lesson-content.dto';
import { MarkProgressDto } from './dto/mark-progress.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('LMS - Lesson Contents')
@Controller('lesson-contents')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class LessonContentsController {
  constructor(private readonly contentsService: LessonContentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new content item within a module' })
  create(@Body() createDto: CreateLessonContentDto) {
    return this.contentsService.create(createDto);
  }

  @Get('by-module/:moduleId')
  @ApiOperation({ summary: 'Get all content items for a specific module' })
  findAllByModule(@Param('moduleId', ParseIntPipe) moduleId: number) {
    return this.contentsService.findAllByModule(moduleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single content item by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing content item' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateLessonContentDto) {
    return this.contentsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a content item' })
  @HttpCode(HttpStatus.OK)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.contentsService.delete(id);
  }

  // --- Progress Tracking Endpoints ---

  @Post(':id/progress')
  @ApiOperation({ summary: 'Mark a content item as completed or not completed for a student' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully.'})
  markProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() markProgressDto: MarkProgressDto
  ) {
    return this.contentsService.markProgress(id, markProgressDto.student_id, markProgressDto.is_completed);
  }

  @Get('progress/by-student-course')
  @ApiOperation({ summary: "Get a student's progress for all content within a course" })
  getStudentProgressForCourse(
    @Query('studentId', ParseIntPipe) studentId: number,
    @Query('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.contentsService.getStudentProgressForCourse(studentId, courseId);
  }
}