import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { teacherAvailabilityTable } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { SetTeacherPreferencesDto } from './dto/set-teacher-preferences.dto';
import { UserService } from '../users/users.service';
import { TermService } from '../terms/terms.service';
import { TimetableSlotsService } from '../timetable-slots/timetable-slots.service';
import { ClassesService } from '../classes/classes.service';

// Define a type for the role object to prevent implicit 'any'
interface UserRole {
  role: string;
}

@Injectable()
export class TeacherPreferencesService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly usersService: UserService,
    private readonly termsService: TermService,
    private readonly slotsService: TimetableSlotsService,
  ) {}

  // --- WRITE OPERATION ---
  async setPreferences(dto: SetTeacherPreferencesDto): Promise<{ message: string }> {
    const { teacher_id, term_id, preferences } = dto;

    const [teacher, term] = await Promise.all([
        this.usersService.findOne(teacher_id),
        this.termsService.findOne(term_id, { with: { academicYear: true } }),
    ]).catch(err => {
        throw new BadRequestException(`Invalid teacher or term ID: ${err.message}`);
    });

    if (!teacher.roles.some((r: UserRole) => r.role === 'teacher')) {
      throw new BadRequestException(`User with ID ${teacher_id} is not a teacher.`);
    }

    if (preferences.length > 0) {
        const schoolId = term.academicYear.school_id;
        const allSlotsForSchool = await this.slotsService.findAllForSchool(schoolId);
        const validSlotIds = new Set(allSlotsForSchool.map(slot => slot.slot_id));
        
        for (const pref of preferences) {
            if (!validSlotIds.has(pref.slot_id)) {
                throw new BadRequestException(`Slot with ID ${pref.slot_id} is invalid or does not belong to the school associated with the term.`);
            }
        }
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(teacherAvailabilityTable).where(and(
          eq(teacherAvailabilityTable.teacher_id, teacher_id),
          eq(teacherAvailabilityTable.term_id, term_id)
      ));
      if (preferences.length === 0) return;
      const preferencesToInsert = preferences.map(p => ({
          teacher_id, term_id, slot_id: p.slot_id, status: p.status,
      }));
      await tx.insert(teacherAvailabilityTable).values(preferencesToInsert);
    });

    return { message: `Successfully set ${preferences.length} preferences for teacher ID ${teacher_id} for term ID ${term_id}.` };
  }

  // --- DIVERSE QUERY METHODS ---

  async getPreferences(teacherId: number, termId: number, includeAllSlots: boolean = false): Promise<any> {
    const [teacher, term] = await Promise.all([
        this.usersService.findOne(teacherId),
        this.termsService.findOne(termId, { with: { academicYear: true } }),
    ]);

    const preferences = await this.db.query.teacherAvailabilityTable.findMany({
        where: and(eq(teacherAvailabilityTable.teacher_id, teacherId), eq(teacherAvailabilityTable.term_id, termId)),
        with: { slot: true },
    });
    
    const sortedPreferences = preferences.sort((a, b) => {
        if (a.slot.day_of_week !== b.slot.day_of_week) return a.slot.day_of_week - b.slot.day_of_week;
        return a.slot.start_time.localeCompare(b.slot.start_time);
    });

    if (!includeAllSlots) {
        return sortedPreferences;
    }

    const schoolId = term.academicYear.school_id;
    const allSlots = await this.slotsService.findAllForSchool(schoolId);
    const preferenceMap = new Map(preferences.map(p => [p.slot_id, p]));

    return allSlots.map(slot => {
        const preference = preferenceMap.get(slot.slot_id);
        return {
            availability_id: preference?.availability_id || null,
            teacher_id: teacherId,
            term_id: termId,
            slot_id: slot.slot_id,
            status: preference?.status || 'available',
            slot: slot,
        };
    });
  }

  async getPreferencesBySlot(slotId: number, termId: number): Promise<any> {
      await this.slotsService.findOne(slotId);
      await this.termsService.findOne(termId);
      
      return this.db.query.teacherAvailabilityTable.findMany({
          where: and(eq(teacherAvailabilityTable.slot_id, slotId), eq(teacherAvailabilityTable.term_id, termId)),
          with: { teacher: { columns: { user_id: true, full_name: true } } }
      });
  }

  async findAllPreferencesForTerm(termId: number): Promise<any> {
      const term = await this.termsService.findOne(termId, { with: { academicYear: true } });
      const schoolId = term.academicYear.school_id;
      
      const allTeachers = await this.usersService.findAllBySchool(schoolId);
      if (allTeachers.length === 0) return [];

      const allPreferences = await this.db.query.teacherAvailabilityTable.findMany({
          where: eq(teacherAvailabilityTable.term_id, termId),
          with: { slot: true }
      });
      
      const preferencesByTeacher = allPreferences.reduce((acc: { [teacherId: number]: any[] }, pref) => {
          if (!acc[pref.teacher_id]) acc[pref.teacher_id] = [];
          acc[pref.teacher_id].push(pref);
          return acc;
      }, {} as { [teacherId: number]: any[] });

      return allTeachers.map(teacher => ({
          teacher_id: teacher.user_id,
          full_name: teacher.full_name,
          preferences: (preferencesByTeacher[teacher.user_id] || []).sort((a, b) => {
            if (a.slot.day_of_week !== b.slot.day_of_week) return a.slot.day_of_week - b.slot.day_of_week;
            return a.slot.start_time.localeCompare(b.slot.start_time);
          })
      }));
  }

  async getSchoolWideAvailabilityMatrix(termId: number): Promise<any> {
      const term = await this.termsService.findOne(termId, { with: { academicYear: true } });
      const schoolId = term.academicYear.school_id;
      
      const [allSlots, allTeachers, allPreferences] = await Promise.all([
          this.slotsService.findAllForSchool(schoolId),
          this.usersService.findAllBySchool(schoolId),
          this.db.query.teacherAvailabilityTable.findMany({
              where: eq(teacherAvailabilityTable.term_id, termId)
          })
      ]);

      const preferenceMap = new Map(allPreferences.map(p => [`${p.teacher_id}-${p.slot_id}`, p.status]));

      return allSlots.map(slot => ({
          slot_details: slot,
          teacher_availabilities: allTeachers.map(teacher => ({
              teacher_id: teacher.user_id,
              full_name: teacher.full_name,
              status: preferenceMap.get(`${teacher.user_id}-${slot.slot_id}`) || 'available'
          }))
      }));
  }
}