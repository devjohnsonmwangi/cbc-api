import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AcademicYearService } from './academic-years.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Academics - Years')
@Controller('academics/years')
@UsePipes(new ValidationPipe({ 
  whitelist: true, 
  forbidNonWhitelisted: true,
  transform: true, 
}))
export class AcademicYearController {
  constructor(private readonly academicYearService: AcademicYearService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new academic year' })
  @ApiResponse({ status: 201, description: 'The academic year has been successfully created.'})
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data, such as end date before start date.' })
  @ApiResponse({ status: 409, description: 'Conflict - The academic year overlaps or has a duplicate name.' })
  create(@Body() createAcademicYearDto: CreateAcademicYearDto) {
    return this.academicYearService.create(createAcademicYearDto);
  }

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'Get all active academic years for a specific school' })
  @ApiParam({ name: 'schoolId', description: 'The unique ID of the school' })
  @ApiResponse({ status: 200, description: 'A list of academic years for the school.'})
  findAllForSchool(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.academicYearService.findAllForSchool(schoolId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single academic year by its ID' })
  @ApiResponse({ status: 200, description: 'The requested academic year object.'})
  @ApiResponse({ status: 404, description: 'Not Found - The academic year with the given ID does not exist.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.academicYearService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing academic year' })
  @ApiResponse({ status: 200, description: 'The academic year has been successfully updated.'})
  @ApiResponse({ status: 404, description: 'Not Found - The academic year with the given ID does not exist.' })
  @ApiResponse({ status: 409, description: 'Conflict - The updated name conflicts with an existing one.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAcademicYearDto: UpdateAcademicYearDto,
  ) {
    return this.academicYearService.update(id, updateAcademicYearDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive an academic year (soft delete)' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'The academic year has been successfully archived.'})
  @ApiResponse({ status: 400, description: 'Bad Request - The year is already archived or has active dependencies.'})
  @ApiResponse({ status: 404, description: 'Not Found - The academic year with the given ID does not exist.' })
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.academicYearService.archive(id);
  }
}