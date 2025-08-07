import { Controller, Post, Body, Get, Param, Patch, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { TimetablesService } from './timetables.service';
import { CreateTimetableVersionDto } from './dto/create-timetable-version.dto';
import { UpdateTimetableVersionDto } from './dto/update-timetable-version.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('Scheduling - Timetables')
@Controller('timetables')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class TimetablesController {
  constructor(private readonly timetablesService: TimetablesService) {}

  // --- Version Management ---

  @Post('versions')
  @ApiOperation({ summary: 'Create a new timetable version (e.g., a draft)' })
  @ApiResponse({ status: 201, description: 'Timetable version created successfully.' })
  @ApiResponse({ status: 404, description: 'The specified term ID was not found.' })
  createVersion(@Body() dto: CreateTimetableVersionDto) {
    const mockUserId = 1; // In a real app, get this from an @User() decorator from the auth token
    return this.timetablesService.createVersion(dto, mockUserId);
  }

  @Post('versions/:id/clone')
  @ApiOperation({ summary: 'Clone an existing timetable version and all its lessons into a new draft' })
  @ApiParam({ name: 'id', description: 'The ID of the source timetable version to clone.' })
  @ApiBody({ schema: { type: 'object', required: ['newName'], properties: { newName: { type: 'string', description: 'The name for the new cloned draft.' } } } })
  @ApiResponse({ status: 201, description: 'Cloned timetable version created successfully.' })
  cloneVersion(@Param('id', ParseIntPipe) id: number, @Body('newName') newName: string) {
      const mockUserId = 1; // From auth
      return this.timetablesService.cloneVersion(id, newName, mockUserId);
  }

  @Get('versions/by-term/:termId')
  @ApiOperation({ summary: 'Get all timetable versions for a specific term' })
  @ApiParam({ name: 'termId', description: 'The ID of the term.' })
  findAllVersionsForTerm(@Param('termId', ParseIntPipe) termId: number) {
      return this.timetablesService.findAllVersionsForTerm(termId);
  }

  @Get('versions/:id')
  @ApiOperation({ summary: 'Get a specific timetable version with all its scheduled lessons' })
  @ApiParam({ name: 'id', description: 'The ID of the timetable version.' })
  findVersion(@Param('id', ParseIntPipe) id: number) {
      return this.timetablesService.findVersionWithLessons(id);
  }

  @Patch('versions/:id/publish')
  @ApiOperation({ summary: 'Publish a timetable version, making it the active one for its type' })
  @ApiParam({ name: 'id', description: 'The ID of the timetable version to publish.' })
  @ApiResponse({ status: 200, description: 'Timetable version published successfully.' })
  publishVersion(@Param('id', ParseIntPipe) id: number) {
      return this.timetablesService.publishVersion(id);
  }
  
  @Delete('versions/:id')
  @ApiOperation({ summary: 'Archive a timetable version' })
  @ApiParam({ name: 'id', description: 'The ID of the timetable version to archive.' })
  @HttpCode(HttpStatus.OK)
  archiveVersion(@Param('id', ParseIntPipe) id: number) {
      return this.timetablesService.archiveVersion(id);
  }

  // --- Lesson Management ---
  @Post('lessons')
  @ApiOperation({ summary: 'Manually add a single lesson to a draft timetable version' })
  @ApiResponse({ status: 201, description: 'Lesson added successfully.'})
  @ApiResponse({ status: 409, description: 'A conflict (teacher, class, or venue) was detected in this time slot.'})
  addLesson(@Body() dto: CreateLessonDto) {
      return this.timetablesService.addLesson(dto);
  }

  @Delete('lessons/:lessonId')
  @ApiOperation({ summary: 'Remove a single lesson from a draft timetable version' })
  @ApiParam({ name: 'lessonId', description: 'The ID of the lesson to remove.' })
  @HttpCode(HttpStatus.OK)
  removeLesson(@Param('lessonId', ParseIntPipe) lessonId: number) {
      return this.timetablesService.removeLesson(lessonId);
  }

  // --- Auto-Generation ---
  @Post('versions/:id/generate')
  @ApiOperation({ summary: 'RUN THE AUTOMATED TIMETABLE GENERATOR for a draft version' })
  @ApiParam({ name: 'id', description: 'The ID of the draft timetable version to populate.' })
  @ApiResponse({ status: 201, description: 'Timetable generation process completed. Check response body for success or conflicts.'})
  @ApiResponse({ status: 400, description: 'Generation failed due to invalid state (e.g., timetable is not a draft).'})
  @ApiResponse({ status: 409, description: 'Generation failed due to missing prerequisite data (e.g., no teacher assigned).'})
  @HttpCode(HttpStatus.CREATED)
  generateTimetable(@Param('id', ParseIntPipe) id: number) {
      return this.timetablesService.generateTimetable(id);
  }

  // --- Personalized & Analytical Views ---
  @Get('published/by-user')
  @ApiOperation({ summary: "Get a user's published timetable(s) by their ID (for teachers, students, parents)" })
  @ApiQuery({ name: 'userId', type: Number })
  @ApiQuery({ name: 'termId', type: Number })
  getPublishedForUser(@Query('userId', ParseIntPipe) userId: number, @Query('termId', ParseIntPipe) termId: number) {
      return this.timetablesService.getPublishedTimetableForUser(userId, termId);
  }

  @Get('published/search-by-user')
  @ApiOperation({ summary: "Search for a user's published timetable by their name or email" })
  @ApiQuery({ name: 'termId', type: Number })
  @ApiQuery({ name: 'searchTerm', type: String })
  @ApiQuery({ name: 'schoolId', type: Number })
  findPublishedByUserDetails(@Query('termId', ParseIntPipe) termId: number, @Query('searchTerm') searchTerm: string, @Query('schoolId', ParseIntPipe) schoolId: number) {
    return this.timetablesService.findPublishedTimetablesByUserDetails(termId, searchTerm, schoolId);
  }
  
  @Get('reports/clashes/:termId')
  @ApiOperation({ summary: 'Finds clashes between ALL published timetables in a term' })
  findClashesInTerm(@Param('termId', ParseIntPipe) termId: number) {
      return this.timetablesService.findClashesInTerm(termId);
  }

  @Get('reports/compare')
  @ApiOperation({ summary: 'Compares two timetable versions to see what has changed' })
  @ApiQuery({ name: 'versionA_id', type: Number })
  @ApiQuery({ name: 'versionB_id', type: Number })
  compareVersions(@Query('versionA_id', ParseIntPipe) versionA_id: number, @Query('versionB_id', ParseIntPipe) versionB_id: number) {
      return this.timetablesService.compareTimetableVersions(versionA_id, versionB_id);
  }
  
  @Get('reports/free-slots/:termId')
  @ApiOperation({ summary: 'Finds free slots for a teacher, class, or venue in a term' })
  @ApiQuery({ name: 'teacherId', type: Number, required: false })
  @ApiQuery({ name: 'classId', type: Number, required: false })
  @ApiQuery({ name: 'venueId', type: Number, required: false })
  findFreeSlots(
      @Param('termId', ParseIntPipe) termId: number,
      @Query('teacherId', new ParseIntPipe({ optional: true })) teacherId?: number,
      @Query('classId', new ParseIntPipe({ optional: true })) classId?: number,
      @Query('venueId', new ParseIntPipe({ optional: true })) venueId?: number,
  ) {
      return this.timetablesService.findFreeSlots(termId, { teacherId, classId, venueId });
  }
  
  @Get('reports/venue-utilization/:termId')
  @ApiOperation({ summary: 'Get a report on venue utilization for a published timetable' })
  getVenueUtilizationReport(@Param('termId', ParseIntPipe) termId: number) {
      return this.timetablesService.getVenueUtilizationReport(termId);
  }

  @Get('reports/teacher-workload/:termId')
  @ApiOperation({ summary: 'Get a report on teacher workload for a published timetable' })
  getTeacherWorkloadReport(@Param('termId', ParseIntPipe) termId: number) {
      return this.timetablesService.getTeacherWorkloadReport(termId);
  }
}