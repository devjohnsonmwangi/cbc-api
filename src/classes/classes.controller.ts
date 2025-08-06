import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Academics - Classes')
@Controller('classes')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({ status: 201, description: 'Class created successfully.'})
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid teacher ID or other data.'})
  @ApiResponse({ status: 409, description: 'Conflict - A class with this name/stream already exists.'})
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'Get all active classes for a specific school' })
  @ApiParam({ name: 'schoolId', description: 'The unique ID of the school' })
  findAllForSchool(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.classesService.findAllForSchool(schoolId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single class by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing class' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a class (soft delete)' })
  @HttpCode(HttpStatus.OK)
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.archive(id);
  }
}