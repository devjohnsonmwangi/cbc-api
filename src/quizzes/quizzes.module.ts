import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { LessonContentsModule } from '../lesson-contents/lesson-contents.module';
import { StudentsModule } from '../students/students.module';

/**
 * The QuizzesModule manages the entire lifecycle of online quizzes,
 * from creation and question management to student attempts and auto-grading.
 */
@Module({
  imports: [
    DrizzleModule,
    LessonContentsModule, // Provides LessonContentsService
    StudentsModule,       // Provides StudentsService
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}