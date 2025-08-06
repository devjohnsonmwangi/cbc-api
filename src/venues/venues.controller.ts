import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Scheduling - Venues')
@Controller('venues')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new venue' })
  @ApiResponse({ status: 201, description: 'Venue created successfully.'})
  @ApiResponse({ status: 409, description: 'A venue with this name already exists in the school.'})
  create(@Body() createVenueDto: CreateVenueDto) {
    return this.venuesService.create(createVenueDto);
  }

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'Get all active venues for a specific school' })
  @ApiParam({ name: 'schoolId', description: 'The unique ID of the school' })
  findAllForSchool(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.venuesService.findAllForSchool(schoolId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single venue by its ID' })
  @ApiResponse({ status: 200, description: 'The requested venue object.'})
  @ApiResponse({ status: 404, description: 'Venue with the given ID not found.'})
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.venuesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing venue' })
  @ApiResponse({ status: 200, description: 'Venue updated successfully.'})
  update(@Param('id', ParseIntPipe) id: number, @Body() updateVenueDto: UpdateVenueDto) {
    return this.venuesService.update(id, updateVenueDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a venue (soft delete)' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Venue archived successfully.'})
  @ApiResponse({ status: 400, description: 'The venue is already archived.'})
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.venuesService.archive(id);
  }
}