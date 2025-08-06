import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { StudentEnrollmentsService } from './student-enrollment.service';
import { CreateEnrollmentDto } from './dto/create-student-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-student-enrollment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Academics - Student Enrollments')
@Controller('student-enrollments')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class StudentEnrollmentsController {
  constructor(private readonly enrollmentsService: StudentEnrollmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Enroll a student into a class for an academic year' })
  @ApiResponse({ status: 201, description: 'Student enrolled successfully.'})
  @ApiResponse({ status: 400, description: 'Bad Request - e.g., entities are from different schools.'})
  @ApiResponse({ status: 409, description: 'Conflict - Student is already enrolled for this year.'})
  create(@Body() createDto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(createDto);
  }
  
  @Get(':id')
  @ApiOperation({ summary: 'Get a single enrollment record by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentsService.findOne(id);
  }

  @Get('by-class/:classId')
  @ApiOperation({ summary: 'Get all enrollments for a specific class' })
  findAllByClass(@Param('classId', ParseIntPipe) classId: number) {
    return this.enrollmentsService.findAllByClass(classId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an enrollment record (e.g., change status or class)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateEnrollmentDto) {
    return this.enrollmentsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an enrollment record' })
  @HttpCode(HttpStatus.OK)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentsService.delete(id);
  }
}