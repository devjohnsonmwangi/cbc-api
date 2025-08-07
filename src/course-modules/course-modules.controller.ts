import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { CourseModulesService } from './course-modules.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('LMS - Course Modules')
@Controller('course-modules')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class CourseModulesController {
  constructor(private readonly modulesService: CourseModulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new module within a course' })
  @ApiResponse({ status: 201, description: 'Module created successfully.'})
  @ApiResponse({ status: 409, description: 'A module with this title or order already exists.'})
  create(@Body() createDto: CreateCourseModuleDto) {
    return this.modulesService.create(createDto);
  }

  @Get('by-course/:courseId')
  @ApiOperation({ summary: 'Get all modules for a specific course' })
  findAllByCourse(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.modulesService.findAllByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single course module by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.modulesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing course module (e.g., change title or order)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCourseModuleDto) {
    return this.modulesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a course module' })
  @HttpCode(HttpStatus.OK)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.modulesService.delete(id);
  }
}