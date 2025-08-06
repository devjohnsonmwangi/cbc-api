import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { StudentEnrollmentsController } from './student-enrollment.controller';
import { StudentEnrollmentsService } from './student-enrollment.service';
import { StudentsModule } from '../students/students.module';
import { ClassesModule } from '../classes/classes.module';
import { AcademicYearsModule } from '../academic-years/academic-years.module';

/**
 * The StudentEnrollmentsModule handles the logic of enrolling students into classes for an academic year.
 * It is a crucial link between several core modules and validates their relationships.
 */
@Module({
  imports: [
    DrizzleModule,
    StudentsModule,      // Provides StudentService
    ClassesModule,       // Provides ClassesService
    AcademicYearsModule, // Provides AcademicYearService
  ],
  controllers: [StudentEnrollmentsController],
  providers: [StudentEnrollmentsService],
  exports: [StudentEnrollmentsService],
})
export class StudentEnrollmentsModule {}