import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { CourseModulesController } from './course-modules.controller';
import { CourseModulesService } from './course-modules.service';
import { CoursesModule } from '../courses/courses.module';

/**
 * The CourseModulesModule manages the organizational units (e.g., chapters, sections)
 * within a course. It depends on the CoursesModule to ensure that every module
 * is associated with a valid course.
 */
@Module({
  imports: [
    DrizzleModule,
    CoursesModule, // Provides CoursesService for validation
  ],
  controllers: [CourseModulesController],
  providers: [CourseModulesService],
  exports: [CourseModulesService], // Export for use by the LessonContentModule
})
export class CourseModulesModule {}