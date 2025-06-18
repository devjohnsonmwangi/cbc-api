import { Module } from '@nestjs/common';
import { SchoolService } from './schools.service';
import { SchoolController } from './schools.controller';

@Module({
  controllers: [SchoolController],
  providers: [SchoolService],
  // Export the SchoolService so it can be injected into other modules,
  // such as the UserService for validating a school's existence.
  exports: [SchoolService],
})
export class SchoolModule {}