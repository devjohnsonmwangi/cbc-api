import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { SubjectsModule } from '../subjects/subjects.module';
import { UserModule } from '../users/users.module';
import { AcademicYearsModule } from '../academic-years/academic-years.module';

/**
 * The CoursesModule is the foundational block of the LMS. It manages the top-level
 * course containers, linking subjects, teachers, and academic years to create
 * a structured learning experience.
 */
@Module({
  imports: [
    DrizzleModule,
    SubjectsModule,      // Provides SubjectsService
    UserModule,         // Provides UserService
    AcademicYearsModule, // Provides AcademicYearsService
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService], // Export for use in CourseModules, Assignments, etc.
})
export class CoursesModule {}