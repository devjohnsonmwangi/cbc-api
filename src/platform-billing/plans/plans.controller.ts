import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, Query, ParseBoolPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Platform Billing - Plans')
@Controller('platform/plans')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
// Add security here, e.g., @Roles('super_admin')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription plan' })
  create(@Body() createDto: CreatePlanDto) {
    return this.plansService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiQuery({ name: 'onlyActive', type: Boolean, required: false, description: 'Set to false to include inactive plans.' })
  findAll(@Query('onlyActive', new ParseBoolPipe({ optional: true })) onlyActive: boolean = true) {
    return this.plansService.findAll(onlyActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single plan by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdatePlanDto) {
    return this.plansService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a subscription plan' })
  @HttpCode(HttpStatus.OK)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.delete(id);
  }
}