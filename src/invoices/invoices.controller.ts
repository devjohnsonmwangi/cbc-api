import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, UsePipes, ValidationPipe, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('Finance - Invoices')
@Controller('invoices')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // --- CORE & BULK OPERATIONS ---
  @Post() @ApiOperation({ summary: 'Create a single manual invoice' })
  create(@Body() createDto: CreateInvoiceDto) { /* ... */ }
  
  @Post('generate-for-class') @ApiOperation({ summary: 'Auto-generate invoices for all students in a class' })
  generateForClass(@Body() body: { classId: number; termId: number; dueDate: string; }) {
    return this.invoicesService.generateInvoicesForClass(body.classId, body.termId, body.dueDate);
  }

  // --- STANDARD QUERIES ---
  @Get('by-student/:studentId') @ApiOperation({ summary: 'Get all invoices for a specific student' })
  findAllByStudent(@Param('studentId', ParseIntPipe) studentId: number) { /* ... */ }

  @Get(':id') @ApiOperation({ summary: 'Get a single invoice by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { /* ... */ }

  @Patch(':id') @ApiOperation({ summary: 'Update an existing invoice' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateInvoiceDto) { /* ... */ }

  // --- ADVANCED ANALYTICAL & OPERATIONAL ENDPOINTS ---

  @Get('reports/financial-overview/:termId')
  @ApiOperation({ summary: 'Get a high-level financial summary for a term' })
  getFinancialOverview(@Param('termId', ParseIntPipe) termId: number) {
    return this.invoicesService.getFinancialOverview(termId);
  }

  @Get('reports/overdue/:schoolId')
  @ApiOperation({ summary: 'Get all overdue invoices for a school' })
  findOverdueInvoices(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.invoicesService.findOverdueInvoices(schoolId);
  }

  @Get('reports/parent-statement/:parentUserId')
  @ApiOperation({ summary: "Get a parent's complete financial statement for all their children" })
  getParentFinancialStatement(@Param('parentUserId', ParseIntPipe) parentUserId: number) {
    return this.invoicesService.getParentFinancialStatement(parentUserId);
  }

  @Get('reports/payment-reconciliation/:schoolId')
  @ApiOperation({ summary: 'Get a payment reconciliation report for a date range' })
  @ApiQuery({ name: 'startDate', type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', type: String, example: '2024-03-31' })
  @ApiQuery({ name: 'gateway', enum: ['mpesa', 'bank_transfer', 'stripe', 'cash'], required: false })
  getPaymentReconciliationReport(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('gateway') gateway?: any,
  ) {
    return this.invoicesService.getPaymentReconciliationReport(schoolId, startDate, endDate, gateway);
  }
}