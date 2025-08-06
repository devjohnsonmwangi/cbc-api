import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { TeacherAssignmentsController } from './teacher-assignments.controller';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { UserModule } from '../users/users.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { ClassesModule } from '../classes/classes.module';

/**
 * The TeacherAssignmentsModule manages the linking of teachers to the subjects they teach in specific classes.
 * It depends on Users, Subjects, and Classes modules to ensure data integrity.
 */
@Module({
  imports: [
    DrizzleModule,
    UserModule,    // Provides UserService
    SubjectsModule, // Provides SubjectsService
    ClassesModule,  // Provides ClassesService
  ],
  controllers: [TeacherAssignmentsController],
  providers: [TeacherAssignmentsService],
  exports: [TeacherAssignmentsService],
})
export class TeacherAssignmentsModule {}