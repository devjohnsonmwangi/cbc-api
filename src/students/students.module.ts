import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { SchoolModule } from '../schools/schools.module';
import { UserModule } from '../users/users.module';

/**
 * The StudentsModule manages all operations related to students and their links to parents.
 * It depends on the SchoolsModule to validate the school association and the UsersModule
 * to validate both the student's optional user account and the parent's user account.
 */
@Module({
  imports: [
    DrizzleModule,
    SchoolModule, // Provides SchoolService
    UserModule,   // Provides UserService
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService], // Export for use in StudentEnrollmentsModule, etc.
})
export class StudentsModule {}