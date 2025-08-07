import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { FeeStructuresController } from './fee-structures.controller';
import { FeeStructuresService } from './fee-structures.service';
import { AcademicYearsModule } from '../academic-years/academic-years.module';

/**
 * The FeeStructuresModule manages the fee policies for different grade levels
 * within a specific academic year. It is the foundation of the finance module.
 */
@Module({
  imports: [
    DrizzleModule,
    AcademicYearsModule, // Provides AcademicYearsService for validation
  ],
  controllers: [FeeStructuresController],
  providers: [FeeStructuresService],
  exports: [FeeStructuresService], // Export for use by the InvoicesModule later
})
export class FeeStructuresModule {}