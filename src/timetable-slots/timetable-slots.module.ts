import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { SchoolModule } from '../schools/schools.module';
import { TimetableSlotsController } from './timetable-slots.controller';
import { TimetableSlotsService } from './timetable-slots.service';

@Module({
  imports: [DrizzleModule, SchoolModule],
  controllers: [TimetableSlotsController],
  providers: [TimetableSlotsService],
  exports: [TimetableSlotsService],
})
export class TimetableSlotsModule {}