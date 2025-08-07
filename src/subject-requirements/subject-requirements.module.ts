import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { SubjectRequirementsController } from './subject-requirements.controller';
import { SubjectRequirementsService } from './subject-requirements.service';
import { TermsModule } from '../terms/terms.module';
import { ClassesModule } from '../classes/classes.module';
import { SubjectsModule } from '../subjects/subjects.module';

/**
 * The SubjectRequirementsModule manages the academic requirements for subjects within classes per term.
 * This is a core configuration module for the automated timetable generator.
 */
@Module({
  imports: [
    DrizzleModule,
    TermsModule,    // Provides TermService
    ClassesModule,  // Provides ClassesService
    SubjectsModule, // Provides SubjectsService
  ],
  controllers: [SubjectRequirementsController],
  providers: [SubjectRequirementsService],
  exports: [SubjectRequirementsService],
})
export class SubjectRequirementsModule {}