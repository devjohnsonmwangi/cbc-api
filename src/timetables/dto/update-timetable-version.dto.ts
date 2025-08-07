import { PartialType } from '@nestjs/mapped-types';
import { CreateTimetableVersionDto } from './create-timetable-version.dto';

export class UpdateTimetableVersionDto extends PartialType(CreateTimetableVersionDto) {
    // A timetable's term should be immutable after creation.
    term_id?: never;
}