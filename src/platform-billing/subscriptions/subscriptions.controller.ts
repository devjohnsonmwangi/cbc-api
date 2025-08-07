import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Platform Billing - Subscriptions')
@Controller('platform/subscriptions')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
// Add security here, e.g., @Roles('super_admin')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription for a school' })
  create(@Body() createDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createDto);
  }

  @Get('by-school/:schoolId')
  @ApiOperation({ summary: 'Get the subscription for a specific school' })
  findBySchool(@Param('schoolId', ParseIntPipe) schoolId: number) {
      return this.subscriptionsService.findBySchool(schoolId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single subscription by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription (e.g., renew billing period)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, updateDto);
  }

  @Delete(':id/cancel')
  @ApiOperation({ summary: 'Cancel a school\'s subscription' })
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.cancel(id);
  }
}