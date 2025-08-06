import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { SchoolModule } from '../schools/schools.module';
import { UserModule } from '../users/users.module';

/**
 * The ClassesModule encapsulates all logic for managing school classes.
 * It imports the SchoolsModule and UsersModule to validate the existence
 * of the parent school and the assigned class teacher.
 */
@Module({
  imports: [
    DrizzleModule,
    SchoolModule, // Import to use SchoolService
    UserModule,   // Import to use UserService
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService], // Export for use in other modules (e.g., StudentEnrollmentModule)
})
export class ClassesModule {}