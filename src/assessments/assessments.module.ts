import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { TermsModule } from '../terms/terms.module';
import { StudentsModule } from '../students/students.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { UserModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module'; // 1. Import ClassesModule

@Module({
  imports: [
    DrizzleModule,
    TermsModule,
    StudentsModule,
    SubjectsModule,
    UserModule,
    ClassesModule, // 2. Add ClassesModule to the imports array
  ],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}