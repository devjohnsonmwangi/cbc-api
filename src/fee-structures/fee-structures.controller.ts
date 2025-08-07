import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { FeeStructuresService } from './fee-structures.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Finance - Fee Structures')
@Controller('fee-structures')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class FeeStructuresController {
  constructor(private readonly feeStructuresService: FeeStructuresService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new fee structure for a grade level' })
  @ApiResponse({ status: 201, description: 'Fee structure created successfully.'})
  @ApiResponse({ status: 409, description: 'A fee structure for this grade level already exists in this academic year.'})
  create(@Body() createDto: CreateFeeStructureDto) {
    return this.feeStructuresService.create(createDto);
  }

  @Get('by-year/:yearId')
  @ApiOperation({ summary: 'Get all fee structures for a specific academic year' })
  findAllByAcademicYear(@Param('yearId', ParseIntPipe) yearId: number) {
    return this.feeStructuresService.findAllByAcademicYear(yearId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single fee structure by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.feeStructuresService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing fee structure (e.g., change amount or description)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateFeeStructureDto) {
    return this.feeStructuresService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a fee structure' })
  @HttpCode(HttpStatus.OK)
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.feeStructuresService.archive(id);
  }
}