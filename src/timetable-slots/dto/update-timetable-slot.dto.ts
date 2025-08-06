import { PartialType } from '@nestjs/mapped-types';
import { CreateTimetableSlotDto } from './create-timetable-slot.dto';

export class UpdateTimetableSlotDto extends PartialType(CreateTimetableSlotDto) {
    school_id?: never;
}