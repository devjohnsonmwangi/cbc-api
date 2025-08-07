import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { TimetablesController } from './timetables.controller';
import { TimetablesService } from './timetables.service';
import { TermsModule } from '../terms/terms.module';
import { UserModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { VenuesModule } from '../venues/venues.module';
import { TimetableSlotsModule } from '../timetable-slots/timetable-slots.module';
import { SubjectRequirementsModule } from '../subject-requirements/subject-requirements.module';
import { TeacherPreferencesModule } from '../teacher-preferences/teacher-preferences.module';
import { StudentEnrollmentsModule } from '../student-enrollment/student-enrollment.module';

/**
 * The TimetablesModule is the central engine for all scheduling logic.
 * It manages timetable versions, manual lesson placement, the automated generation algorithm,
 * personalized views, and advanced analytics. It brings together nearly all other
 * academic and operational modules to function.
 */
@Module({
  imports: [
    DrizzleModule,
    TermsModule,
    UserModule,
    ClassesModule, 
    SubjectsModule,
    VenuesModule,
    TimetableSlotsModule,
    SubjectRequirementsModule,
    TeacherPreferencesModule,
    StudentEnrollmentsModule,
  ],
  controllers: [TimetablesController],
  providers: [TimetablesService],
  exports: [TimetablesService],
})
export class TimetablesModule {}