// developed    with  NestJS, TypeScript, and Drizzle ORM
// developed  by   senior  developer   Eng Johnson Mwangi
// this   code  is  part  of  a  school management system API
// this   code  is  for  managing official school-wide announcements
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
  Patch,
  Delete,
  Req,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto, GetReceiptsQueryDto } from './dto/announcement.dto';

// --- CORRECTED: Using the auth DTOs you have ---
import { AuthGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
// --- THIS IS THE KEY IMPORT ---
import { AuthenticatedRequest } from '../../auth/dto/auth.dto';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
@UseGuards(AuthGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('school_admin', 'dos')
  @ApiOperation({ summary: 'Create a new announcement (Requires Admin/DOS role)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'The announcement has been successfully created.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User does not have the required role.' })
  create(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @Req() request: AuthenticatedRequest, // <-- Use the strongly-typed request
  ) {
    const { id: authorUserId, schoolId } = request.user; // <-- Now fully type-safe
    return this.announcementsService.create(createAnnouncementDto, authorUserId, schoolId!);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all announcements for the user\'s school' })
  @ApiResponse({ status: HttpStatus.OK, description: 'A list of announcements.' })
  findAllForSchool(@Req() request: AuthenticatedRequest) {
    const { schoolId } = request.user;
    return this.announcementsService.findAllForSchool(schoolId!);
  }

  @Get(':announcementId')
  @ApiOperation({ summary: 'Retrieve a single announcement by its ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'The requested announcement.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Announcement not found.' })
  findOneById(
    @Param('announcementId', ParseIntPipe) announcementId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    const { schoolId } = request.user;
    return this.announcementsService.findOneById(announcementId, schoolId!);
  }
  
  // ... other methods will follow the same pattern ...

  @Patch(':announcementId')
  @UseGuards(RolesGuard)
  @Roles('school_admin', 'dos')
  @ApiOperation({ summary: 'Update an existing announcement (Requires Admin/DOS role)' })
  update(
    @Param('announcementId', ParseIntPipe) announcementId: number,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const { schoolId } = request.user;
    return this.announcementsService.update(announcementId, updateAnnouncementDto, schoolId!);
  }

  @Delete(':announcementId')
  @UseGuards(RolesGuard)
  @Roles('school_admin')
  @ApiOperation({ summary: 'Archive an announcement (Requires Admin role)' })
  @HttpCode(HttpStatus.OK)
  archive(
    @Param('announcementId', ParseIntPipe) announcementId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    const { schoolId } = request.user;
    return this.announcementsService.archive(announcementId, schoolId!);
  }

  @Post(':announcementId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge reading an announcement' })
  @HttpCode(HttpStatus.CREATED)
  acknowledgeReceipt(
    @Param('announcementId', ParseIntPipe) announcementId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    const { id: userId } = request.user;
    return this.announcementsService.acknowledgeReceipt(announcementId, userId);
  }
}