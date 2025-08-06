import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { TermService } from './terms.service';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Academics - Terms')
@Controller('academics/terms')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class TermController {
  constructor(private readonly termService: TermService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new term within an academic year' })
  @ApiResponse({ status: 201, description: 'The term has been successfully created.'})
  @ApiResponse({ status: 400, description: 'Bad Request - e.g., term dates are outside the academic year.' })
  @ApiResponse({ status: 409, description: 'Conflict - The term overlaps or has a duplicate name.' })
  create(@Body() createTermDto: CreateTermDto) {
    return this.termService.create(createTermDto);
  }

  @Get('by-year/:yearId')
  @ApiOperation({ summary: 'Get all active terms for a specific academic year' })
  @ApiParam({ name: 'yearId', description: 'The unique ID of the parent academic year' })
  @ApiResponse({ status: 200, description: 'A list of terms.'})
  findAllForAcademicYear(@Param('yearId', ParseIntPipe) yearId: number) {
    return this.termService.findAllForAcademicYear(yearId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single term by its ID' })
  @ApiResponse({ status: 200, description: 'The requested term object.'})
  @ApiResponse({ status: 404, description: 'Not Found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.termService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing term' })
  @ApiResponse({ status: 200, description: 'The term has been successfully updated.'})
  @ApiResponse({ status: 404, description: 'Not Found.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTermDto: UpdateTermDto) {
    return this.termService.update(id, updateTermDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a term (soft delete)' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'The term has been successfully archived.'})
  @ApiResponse({ status: 404, description: 'Not Found.' })
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.termService.archive(id);
  }
}