import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { SchoolModule } from '../schools/schools.module';

/**
 * The SubjectsModule handles all operations related to academic subjects.
 * It depends on the SchoolsModule to ensure subjects are associated with a valid school.
 */
@Module({
  imports: [
    DrizzleModule,
    SchoolModule, // Import to use SchoolService for validation
  ],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService], // Export for use in other modules (e.g., TeacherAssignmentModule)
})
export class SubjectsModule {}