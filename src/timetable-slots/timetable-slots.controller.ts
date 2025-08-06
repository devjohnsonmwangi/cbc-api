import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { TimetableSlotsService } from './timetable-slots.service';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Scheduling - Timetable Slots')
@Controller('timetable-slots')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class TimetableSlotsController {
  constructor(private readonly slotsService: TimetableSlotsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new recurring timetable slot' })
  @ApiResponse({ status: 201, description: 'Slot created successfully.'})
  @ApiResponse({ status: 400, description: 'Bad Request - e.g., end time is not after start time.'})
  @ApiResponse({ status: 409, description: 'Conflict - The proposed time slot overlaps with an existing one.'})
  create(@Body() createDto: CreateTimetableSlotDto) {
    return this.slotsService.create(createDto);
  }

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'Get all timetable slots for a school, ordered by day and time' })
  //...
  findAllForSchool(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.slotsService.findAllForSchool(schoolId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single timetable slot by its ID' })
  //...
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.slotsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing timetable slot' })
  //...
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateTimetableSlotDto) {
    return this.slotsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a timetable slot' })
  //...
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.slotsService.delete(id);
  }
}