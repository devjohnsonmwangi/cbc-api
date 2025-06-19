import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query, Req, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { SchoolService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { AuthGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Controller for managing schools.
 * All endpoints are protected and require authentication.
 * Access is restricted by roles, with 'super_admin' having the highest privileges.
 */
@UseGuards(AuthGuard, RolesGuard)
@Controller('schools')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  /**
   * Endpoint for a super_admin to create a new school.
   */
  @Post()
  @Roles('super_admin')
  create(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolService.create(createSchoolDto);
  }

  /**
   * Endpoint for a super_admin to retrieve a list of all non-archived schools.
   */
  @Get()
  @Roles('super_admin')
  findAll() {
    return this.schoolService.findAll();
  }

  /**
   * Endpoint to retrieve a single school's details.
   * Accessible by super_admin for any school.
   * Accessible by school_admin for THEIR OWN school only.
   */
  @Get(':id')
  @Roles('super_admin', 'school_admin','dos','support_staff')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as { sub: number; school_id: number; roles: { role: string }[] };
    const userRoles = user.roles.map(r => r.role);

    // If the user is a school_admin, they can only access their own school's data.
    if (userRoles.includes('school_admin') && !userRoles.includes('super_admin')) {
      if (user.school_id !== id) {
        throw new ForbiddenException('You are not authorized to access information for this school.');
      }
    }
    
    return this.schoolService.findOne(id);
  }

  /**
   * Endpoint for a super_admin to update a school's details.
   */
  @Patch(':id')
  @Roles('super_admin', 'school_admin', 'dos', 'support_staff')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolService.update(id, updateSchoolDto);
  }

  /**
   * Endpoint for a super_admin to archive a school (soft delete).
   */
  @Delete(':id')
  @Roles('super_admin')
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.schoolService.archive(id);
  }
}