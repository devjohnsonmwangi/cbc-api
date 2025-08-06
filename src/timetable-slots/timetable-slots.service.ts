import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { timetableSlotTable, TTimetableSlotSelect, lessonTable } from '../drizzle/schema';
import { eq, and, gt, lt, ne } from 'drizzle-orm';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
import { SchoolService } from '../schools/schools.service';

@Injectable()
export class TimetableSlotsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly schoolService: SchoolService,
  ) {}

  private async checkForOverlap(
    school_id: number,
    day_of_week: number,
    start_time: string,
    end_time: string,
    excludeSlotId?: number
  ): Promise<void> {
    const conditions = [
      eq(timetableSlotTable.school_id, school_id),
      eq(timetableSlotTable.day_of_week, day_of_week),
      lt(timetableSlotTable.start_time, end_time),
      gt(timetableSlotTable.end_time, start_time)
    ];

    if (excludeSlotId) {
      conditions.push(ne(timetableSlotTable.slot_id, excludeSlotId));
    }

    const overlappingSlot = await this.db.query.timetableSlotTable.findFirst({
        where: and(...conditions)
    });

    if (overlappingSlot) {
        throw new ConflictException(`This time slot (${start_time}-${end_time}) overlaps with an existing slot (${overlappingSlot.start_time}-${overlappingSlot.end_time}) on this day.`);
    }
  }

  async create(createDto: CreateTimetableSlotDto): Promise<TTimetableSlotSelect> {
    const { school_id, day_of_week, start_time, end_time } = createDto;
    
    await this.schoolService.findOne(school_id);
    await this.checkForOverlap(school_id, day_of_week, start_time, end_time);

    const [newSlot] = await this.db.insert(timetableSlotTable).values(createDto).returning();
    return newSlot;
  }

  async findOne(id: number): Promise<TTimetableSlotSelect> {
    const slot = await this.db.query.timetableSlotTable.findFirst({ 
        where: eq(timetableSlotTable.slot_id, id) 
    });
    if (!slot) {
      throw new NotFoundException(`Timetable slot with ID ${id} not found.`);
    }
    return slot;
  }

  async findAllForSchool(schoolId: number): Promise<TTimetableSlotSelect[]> {
    await this.schoolService.findOne(schoolId);
    return this.db.query.timetableSlotTable.findMany({
        where: eq(timetableSlotTable.school_id, schoolId),
        orderBy: (slots, { asc }) => [asc(slots.day_of_week), asc(slots.start_time)]
    });
  }

  async update(id: number, updateDto: UpdateTimetableSlotDto): Promise<TTimetableSlotSelect> {
    const existingSlot = await this.findOne(id);
    
    const new_day = updateDto.day_of_week ?? existingSlot.day_of_week;
    const new_start_time = updateDto.start_time ?? existingSlot.start_time;
    const new_end_time = updateDto.end_time ?? existingSlot.end_time;
    
    if (new_start_time >= new_end_time) {
        throw new BadRequestException('Start time must be strictly before end time.');
    }

    await this.checkForOverlap(existingSlot.school_id, new_day, new_start_time, new_end_time, id);

    const [updatedSlot] = await this.db.update(timetableSlotTable).set(updateDto).where(eq(timetableSlotTable.slot_id, id)).returning();
    return updatedSlot;
  }

  async delete(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    
    const activeLesson = await this.db.query.lessonTable.findFirst({ 
      where: eq(lessonTable.slot_id, id) 
    });
    if (activeLesson) {
      throw new ConflictException(`Cannot delete slot as it is currently assigned to one or more lessons. Please remove lessons from this slot first.`);
    }

    await this.db.delete(timetableSlotTable).where(eq(timetableSlotTable.slot_id, id));
    return { message: `Timetable slot with ID ${id} has been successfully deleted.` };
  }
}