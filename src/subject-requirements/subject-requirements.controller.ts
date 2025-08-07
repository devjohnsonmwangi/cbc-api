import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { SubjectRequirementsService } from './subject-requirements.service';
import { CreateSubjectRequirementDto } from './dto/create-subject-requirement.dto';
import { UpdateSubjectRequirementDto } from './dto/update-subject-requirement.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Scheduling - Subject Requirements')
@Controller('subject-requirements')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class SubjectRequirementsController {
  constructor(private readonly requirementsService: SubjectRequirementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subject requirement for the timetable generator' })
  @ApiResponse({ status: 201, description: 'Requirement created successfully.'})
  @ApiResponse({ status: 409, description: 'This requirement already exists.'})
  create(@Body() createDto: CreateSubjectRequirementDto) {
    return this.requirementsService.create(createDto);
  }

  @Get('by-term/:termId')
  @ApiOperation({ summary: 'Get all subject requirements for a specific term' })
  findAllForTerm(@Param('termId', ParseIntPipe) termId: number) {
    return this.requirementsService.findAllForTerm(termId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single subject requirement by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.requirementsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing subject requirement' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateSubjectRequirementDto) {
    return this.requirementsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subject requirement' })
  @HttpCode(HttpStatus.OK)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.requirementsService.delete(id);
  }
}