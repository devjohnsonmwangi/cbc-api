import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post()
  @Roles('super_admin', 'school_admin','dos','support_staff')
  create(@Body() createUserDto: CreateUserDto, @Req() req: Request & { user?: any }) {
    // Pass the creator's roles from their JWT token to the service
    const creatorRoles = req.user?.roles?.map((r: { role: string }) => r.role) || [];
    return this.userService.create(createUserDto, creatorRoles);
  }

  @Get()
  @Roles('school_admin', 'super_admin', 'dos', 'teacher',)
  findAllBySchool(@Query('schoolId', ParseIntPipe) schoolId: number) {
    return this.userService.findAllBySchool(schoolId);
  }

  @Get(':id')
  @Roles('school_admin', 'super_admin', 'dos', 'teacher','accountant','board_member','groundsman','librarian','parent','support_staff','kitchen_staff')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findOne(id);
    const { password, two_factor_secret, ...result } = user;
    return result;
  }

  @Patch(':id')
  @Roles('school_admin', 'super_admin', 'dos', 'teacher', 'accountant', 'board_member', 'groundsman', 'librarian', 'parent', 'support_staff', 'kitchen_staff')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('school_admin','super_admin','dos','support_staff')
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.userService.archive(id);
  }
}