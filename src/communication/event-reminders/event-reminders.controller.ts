// developed    with  NestJS, TypeScript, and Drizzle ORM
// developed  by   senior  developer   Eng Johnson Mwangi
// this   code  is  part  of  a  school management system API
// this   code  is  for  managing event reminders
// any  issues  or   bugs  should    be  reported  to   the   developer  team:  senior developer Eng Johnson Mwangi
// my   email: johnsonthuraniramwangi@gmail.com
// or our   developer  team email: jomulimited2@gmail.com

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventRemindersService } from './event-reminders.service';
import { CreateEventReminderDto } from './dto/event-reminder.dto';
import { AuthGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../auth/dto/auth.dto';

@ApiTags('Events -> Reminders')
@ApiBearerAuth()
@Controller('events/:eventId/reminders') // Nested route for clear resource hierarchy
@UseGuards(AuthGuard, RolesGuard) // Secure all routes at the controller level
export class EventRemindersController {
  constructor(private readonly eventRemindersService: EventRemindersService) {}

  @Post()
  @Roles('school_admin', 'dos') // Only admins and DOS can set official reminders
  @ApiOperation({ summary: 'Create a new reminder for an event (Requires Admin/DOS role)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'The event reminder has been successfully scheduled.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input, e.g., reminder time is in the past.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'The parent event was not found.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User does not have the required role.' })
  create(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() createEventReminderDto: CreateEventReminderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { schoolId } = request.user;
    return this.eventRemindersService.create(eventId, createEventReminderDto, schoolId!);
  }

  @Get()
  @Roles('school_admin', 'dos')
  @ApiOperation({ summary: 'Retrieve all reminders for a specific event (Requires Admin/DOS role)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'A list of scheduled reminders for the event.' })
  @ApiResponse({ status:HttpStatus.NOT_FOUND, description: 'The parent event was not found.' })
  findAllForEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    const { schoolId } = request.user;
    return this.eventRemindersService.findAllForEvent(eventId, schoolId!);
  }

  @Delete(':reminderId')
  @Roles('school_admin', 'dos')
  @ApiOperation({ summary: 'Delete a scheduled event reminder (Requires Admin/DOS role)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'The reminder has been successfully deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'The specified reminder or event was not found.' })
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('reminderId', ParseIntPipe) reminderId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    const { schoolId } = request.user;
    return this.eventRemindersService.remove(reminderId, eventId, schoolId!);
  }
}