import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { LinkParentDto } from './dto/link-parent.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Academics - Students')
@Controller('students')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new student record' })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'Get all students for a specific school' })
  findAllForSchool(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.studentsService.findAllForSchool(schoolId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single student by their ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing student record' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a student record' })
  @HttpCode(HttpStatus.OK)
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.archive(id);
  }

  // --- Parent Linking Endpoint ---
  @Post(':studentId/link-parent')
  @ApiOperation({ summary: 'Link a parent user to a student' })
  @ApiParam({ name: 'studentId', description: 'The ID of the student' })
  @ApiBody({ type: LinkParentDto })
  @ApiResponse({ status: 201, description: 'Parent linked successfully.'})
  @ApiResponse({ status: 400, description: 'Bad Request - e.g., user is not a parent.'})
  @ApiResponse({ status: 404, description: 'Not Found - Student or Parent not found.'})
  @ApiResponse({ status: 409, description: 'Conflict - Link already exists.'})
  linkParent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() linkParentDto: LinkParentDto
  ) {
    return this.studentsService.linkParent(studentId, linkParentDto.parent_user_id);
  }
}