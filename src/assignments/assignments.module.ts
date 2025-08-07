import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { LessonContentsModule } from '../lesson-contents/lesson-contents.module';
import { StudentsModule } from '../students/students.module';
import { UserModule } from '../users/users.module';

/**
 * The AssignmentsModule manages course assignments, student submissions,
 * and the grading process within the LMS.
 */
@Module({
  imports: [
    DrizzleModule,
    LessonContentsModule, // Provides LessonContentsService
    StudentsModule,       // Provides StudentsService
    UserModule,          // Provides UserService for teacher validation
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}