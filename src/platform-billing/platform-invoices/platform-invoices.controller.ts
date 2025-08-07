import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, UsePipes, ValidationPipe } from '@nestjs/common';
import { PlatformInvoicesService } from './platform-invoices.service';
import { CreatePlatformInvoiceDto } from './dto/create-platform-invoice.dto';
import { UpdatePlatformInvoiceDto } from './dto/update-platform-invoice.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Platform Billing - Invoices')
@Controller('platform/invoices')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
// Add security here, e.g., @Roles('super_admin')
export class PlatformInvoicesController {
  constructor(private readonly invoicesService: PlatformInvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice for a school subscription' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully.' })
  @ApiResponse({ status: 409, description: 'An invoice for this period already exists.' })
  create(@Body() createDto: CreatePlatformInvoiceDto) {
    return this.invoicesService.create(createDto);
  }

  @Get('by-subscription/:subscriptionId')
  @ApiOperation({ summary: 'Get all invoices for a specific subscription' })
  findAllBySubscription(@Param('subscriptionId', ParseIntPipe) subscriptionId: number) {
    return this.invoicesService.findAllBySubscription(subscriptionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update the status of an invoice' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdatePlatformInvoiceDto) {
    return this.invoicesService.update(id, updateDto);
  }
}