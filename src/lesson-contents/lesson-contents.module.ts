import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { LessonContentsController } from './lesson-contents.controller';
import { LessonContentsService } from './lesson-contents.service';
import { CourseModulesModule } from '../course-modules/course-modules.module';
import { StudentsModule } from '../students/students.module'; // For progress tracking

/**
 * The LessonContentsModule manages the individual learning items within a course module,
 * such as videos, texts, and assignments. It also handles student progress tracking
 * for each content item.
 */
@Module({
  imports: [
    DrizzleModule,
    CourseModulesModule, // Provides CourseModulesService
    StudentsModule,      // Provides StudentsService
  ],
  controllers: [LessonContentsController],
  providers: [LessonContentsService],
  exports: [LessonContentsService], // Export for use by Assignments/Quizzes modules
})
export class LessonContentsModule {}