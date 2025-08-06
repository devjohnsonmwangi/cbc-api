import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { TermController } from './terms.controller';
import { TermService } from './terms.service';
import { AcademicYearsModule } from '../academic-years/academic-years.module';

/**
 * The TermsModule encapsulates all logic for managing academic terms.
 * It imports the AcademicYearsModule to leverage its service for validating
 * the parent-child relationship between academic years and terms.
 */
@Module({
  imports: [
    DrizzleModule,
    AcademicYearsModule, // <-- This makes AcademicYearService available for injection.
  ],
  controllers: [TermController],
  providers: [TermService],
  exports: [TermService], // Export so other modules (like InvoicesModule) can use it.
})
export class TermsModule {}