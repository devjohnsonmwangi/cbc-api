import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { StudentsModule } from '../students/students.module';
import { TermsModule } from '../terms/terms.module';
import { FeeStructuresModule } from '../fee-structures/fee-structures.module';
import { StudentEnrollmentsModule } from '../student-enrollment/student-enrollment.module';

/**
 * The InvoicesModule manages student billing. It is responsible for creating,
 * tracking, and updating invoices based on fee structures, terms, and student enrollments.
 */
@Module({
  imports: [
    DrizzleModule,
    StudentsModule,           // Provides StudentsService
    TermsModule,              // Provides TermService
    FeeStructuresModule,      // Provides FeeStructuresService
    StudentEnrollmentsModule, // Provides StudentEnrollmentsService
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService], // Export for use by the PaymentsModule later
})
export class InvoicesModule {}