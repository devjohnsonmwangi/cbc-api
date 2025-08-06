import { Controller, Post, Body, Get, Query, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus, ParseBoolPipe } from '@nestjs/common';
import { TeacherPreferencesService } from './teacher-preferences.service';
import { SetTeacherPreferencesDto } from './dto/set-teacher-preferences.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Scheduling - Teacher Preferences')
@Controller('teacher-preferences')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class TeacherPreferencesController {
  constructor(private readonly preferencesService: TeacherPreferencesService) {}

  @Post()
  @ApiOperation({ summary: 'Set (or overwrite) the availability preferences for a teacher in a term' })
  @ApiResponse({ status: 201, description: 'Preferences have been set successfully.'})
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid teacher, term, or slot ID provided.'})
  @HttpCode(HttpStatus.CREATED)
  setPreferences(@Body() dto: SetTeacherPreferencesDto) {
    return this.preferencesService.setPreferences(dto);
  }

  @Get()
  @ApiOperation({ summary: "Get a teacher's preferences for a term, with an option to see all slots" })
  @ApiQuery({ name: 'teacherId', type: Number, description: 'The unique ID of the teacher' })
  @ApiQuery({ name: 'termId', type: Number, description: 'The unique ID of the term' })
  @ApiQuery({ name: 'includeAllSlots', type: Boolean, required: false, description: "If true, returns all school slots with the teacher's preference marked (defaults to 'available')." })
  @ApiResponse({ status: 200, description: 'A list of the teacher\'s preferences.'})
  @ApiResponse({ status: 404, description: 'Not Found - The teacher or term does not exist.'})
  getPreferences(
    @Query('teacherId', ParseIntPipe) teacherId: number,
    @Query('termId', ParseIntPipe) termId: number,
    @Query('includeAllSlots', new ParseBoolPipe({ optional: true })) includeAllSlots: boolean = false,
  ) {
    return this.preferencesService.getPreferences(teacherId, termId, includeAllSlots);
  }
  
  @Get('by-slot')
  @ApiOperation({ summary: 'Get all teacher preferences for a specific time slot in a term' })
  @ApiQuery({ name: 'slotId', type: Number })
  @ApiQuery({ name: 'termId', type: Number })
  @ApiResponse({ status: 200, description: 'A list of teacher statuses for the given slot.'})
  getPreferencesBySlot(
      @Query('slotId', ParseIntPipe) slotId: number,
      @Query('termId', ParseIntPipe) termId: number,
  ) {
      return this.preferencesService.getPreferencesBySlot(slotId, termId);
  }
  
  @Get('term-overview')
  @ApiOperation({ summary: 'Get an overview of all teacher preferences for an entire term, grouped by teacher' })
  @ApiQuery({ name: 'termId', type: Number })
  @ApiResponse({ status: 200, description: 'A list of all teachers and their set preferences for the term.'})
  findAllPreferencesForTerm(@Query('termId', ParseIntPipe) termId: number) {
      return this.preferencesService.findAllPreferencesForTerm(termId);
  }
  
  @Get('availability-matrix')
  @ApiOperation({ summary: 'Generate a school-wide availability matrix for a term (for generator input)' })
  @ApiQuery({ name: 'termId', type: Number })
  @ApiResponse({ status: 200, description: 'A matrix of every slot and the availability of every teacher.'})
  getSchoolWideAvailabilityMatrix(@Query('termId', ParseIntPipe) termId: number) {
      return this.preferencesService.getSchoolWideAvailabilityMatrix(termId);
  }
}