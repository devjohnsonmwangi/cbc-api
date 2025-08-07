import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { SchoolConfigurationsController } from './school-configurations.controller';
import { SchoolConfigurationsService } from './school-configurations.service';
import { SchoolModule } from '../schools/schools.module';
import { EncryptionService } from '../common/encryption.service'; // Import our new service

@Module({
  imports: [DrizzleModule, SchoolModule],
  controllers: [SchoolConfigurationsController],
  providers: [
    SchoolConfigurationsService,
    EncryptionService, // Provide the EncryptionService
  ],
  exports: [SchoolConfigurationsService],
})
export class SchoolConfigurationModule {}