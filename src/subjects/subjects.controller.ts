import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Academics - Subjects')
@Controller('subjects')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({ status: 201, description: 'Subject created successfully.'})
  @ApiResponse({ status: 409, description: 'Conflict - A subject with this name or code already exists.'})
  create(@Body() createSubjectDto: CreateSubjectDto) {
    return this.subjectsService.create(createSubjectDto);
  }

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'Get all subjects for a specific school' })
  @ApiParam({ name: 'schoolId', description: 'The unique ID of the school' })
  findAllForSchool(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.subjectsService.findAllForSchool(schoolId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single subject by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing subject' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSubjectDto: UpdateSubjectDto) {
    return this.subjectsService.update(id, updateSubjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a subject' })
  @HttpCode(HttpStatus.OK)
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.archive(id);
  }
}