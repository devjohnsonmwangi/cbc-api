import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { AcademicYearController } from './academic-years.controller';
import { AcademicYearService } from './academic-years.service';

/**
 * The AcademicsModule encapsulates all logic related to core academic structures
 * like academic years, terms, classes, and subjects.
 */
@Module({
  imports: [
    DrizzleModule, // Provides the Drizzle ORM instance to this module's services.
  ],
  controllers: [
    AcademicYearController, // Exposes the API endpoints for academic years.
  ],
  providers: [
    AcademicYearService, // Contains the business logic for academic years.
  ],
  exports: [
    AcademicYearService, // Exports the service so it can be reused by other modules (e.g., EnrollmentModule).
  ],
})
export class AcademicYearsModule {}