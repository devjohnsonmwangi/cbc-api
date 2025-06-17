import { Module } from '@nestjs/common';
import { StudentLeadershipController } from './student-leadership.controller';
import { StudentLeadershipService } from './student-leadership.service';

@Module({
  controllers: [StudentLeadershipController],
  providers: [StudentLeadershipService]
})
export class StudentLeadershipModule {}
