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

  @Post()
  @ApiOperation({ summary: 'Create a single manual invoice' })
  create(@Body() createDto: CreateInvoiceDto) {
    return this.invoicesService.create(createDto);
  }
  
  @Post('generate-for-class')
  @ApiOperation({ summary: 'Auto-generate invoices for all students in a class for a term' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        classId: { type: 'number' },
        termId: { type: 'number' },
        dueDate: { type: 'string', format: 'date', description: 'YYYY-MM-DD' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Invoice generation process completed successfully.' })
  @ApiResponse({ status: 404, description: 'Could not find a valid fee structure for this class/year.' })
  generateForClass(
    @Body('classId', ParseIntPipe) classId: number,
    @Body('termId', ParseIntPipe) termId: number,
    @Body('dueDate') dueDate: string,
  ) {
    return this.invoicesService.generateInvoicesForClass(classId, termId, dueDate);
  }

  @Get('by-student/:studentId')
  @ApiOperation({ summary: 'Get all invoices for a specific student' })
  findAllByStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.invoicesService.findAllByStudent(studentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice by its ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing invoice' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, updateDto);
  }
}