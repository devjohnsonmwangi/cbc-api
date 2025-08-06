import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { TeacherPreferencesController } from './teacher-preferences.controller';
import { TeacherPreferencesService } from './teacher-preferences.service';
import { UserModule } from '../users/users.module';
import { TermsModule } from '../terms/terms.module';
import { TimetableSlotsModule } from '../timetable-slots/timetable-slots.module';
import { ClassesModule } from '../classes/classes.module'; // Import ClassesModule

/**
 * The TeacherPreferencesModule manages the availability and preferences of teachers
 * for specific time slots within a term, a crucial input for the timetable generator.
 */
@Module({
  imports: [
    DrizzleModule,
    UserModule,
    TermsModule,
    TimetableSlotsModule,
    ClassesModule, // Import for use in the service
  ],
  controllers: [TeacherPreferencesController],
  providers: [TeacherPreferencesService],
  exports: [TeacherPreferencesService], // Export for the future Timetable Generator Engine
})
export class TeacherPreferencesModule {}