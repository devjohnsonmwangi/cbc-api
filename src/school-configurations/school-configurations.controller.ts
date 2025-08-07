import { Controller, Get, Put, Body, Param, ParseIntPipe, UsePipes, ValidationPipe } from '@nestjs/common';
import { SchoolConfigurationsService } from './school-configurations.service';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Admin - School Configuration')
@Controller('school-configurations')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class SchoolConfigurationsController {
  constructor(private readonly configService: SchoolConfigurationsService) {}

  @Put(':schoolId')
  @ApiOperation({ summary: 'Update (or create) the configuration for a school' })
  @ApiParam({ name: 'schoolId', description: 'The ID of the school to configure' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully.' })
  update(
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() updateDto: UpdateConfigurationDto,
  ) {
    return this.configService.update(schoolId, updateDto);
  }

  @Get(':schoolId')
  @ApiOperation({ 
    summary: 'Get the configuration for a school (credentials will be encrypted)' 
  })
  @ApiParam({ name: 'schoolId', description: 'The ID of the school' })
  @ApiResponse({ status: 200, description: 'The school configuration.' })
  @ApiResponse({ status: 404, description: 'Configuration not found.' })
  findOne(@Param('schoolId', ParseIntPipe) schoolId: number) {
    return this.configService.findOne(schoolId);
  }
}