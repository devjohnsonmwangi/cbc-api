import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { 
    timetableVersionTable, 
    lessonTable, 
    TTimetableVersionSelect, 
    TLessonSelect, 
    TUserSelect,
    userTable,
    teacherSubjectAssignmentTable,
    studentTable,
    parentStudentLinkTable
} from '../drizzle/schema';
import { eq, and, isNull, ne, inArray, desc, asc, ilike, or } from 'drizzle-orm';
import { CreateTimetableVersionDto } from './dto/create-timetable-version.dto';
import { UpdateTimetableVersionDto } from './dto/update-timetable-version.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { TermService } from '../terms/terms.service';
import { SubjectRequirementsService } from '../subject-requirements/subject-requirements.service';
import { TeacherPreferencesService } from '../teacher-preferences/teacher-preferences.service';
import { VenuesService } from '../venues/venues.service';
import { TimetableSlotsService } from '../timetable-slots/timetable-slots.service';
import { StudentEnrollmentsService } from '../student-enrollment/student-enrollment.service';
import { UserService } from '../users/users.service';
// import { EmailService } from '../notifications/email.service';

/**
 * Internal type definition for a lesson that needs to be scheduled by the generator.
 * @internal This is not for external use.
 */
interface UnscheduledLesson {
  class_id: number;
  subject_id: number;
  teacher_id: number;
  requires_venue_type?: string | null;
  is_double_period: boolean;
  lesson_key: string; 
}

/**
 * Interface for a user's role, used for type safety in callbacks.
 * @internal
 */
interface UserRole {
  role: string;
}

/**
 * TimetablesService is the central engine for all scheduling logic.
 * It manages timetable versions, manual lesson placement, automated generation,
 * personalized views, and advanced analytics.
 * 
 * @warning This service contains highly complex and critical business logic.
 * Modifications, especially to the generation engine, should be done with
 * extreme care and be thoroughly reviewed by senior developers.
 */
@Injectable()
export class TimetablesService {
  private readonly logger = new Logger(TimetablesService.name);

  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly termsService: TermService,
    private readonly subjectRequirementsService: SubjectRequirementsService,
    private readonly teacherPreferencesService: TeacherPreferencesService,
    private readonly venuesService: VenuesService,
    private readonly slotsService: TimetableSlotsService,
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
    private readonly usersService: UserService,
    // private readonly emailService: EmailService,
  ) {}

  // ========================================================================
  // TIMETABLE VERSION MANAGEMENT
  // ========================================================================

  async createVersion(dto: CreateTimetableVersionDto, created_by_user_id: number): Promise<TTimetableVersionSelect> {
    await this.termsService.findOne(dto.term_id);
    const [newVersion] = await this.db.insert(timetableVersionTable).values({ ...dto, created_by_user_id }).returning();
    return newVersion;
  }
  
  async findVersionWithLessons(id: number): Promise<any> {
    const version = await this.db.query.timetableVersionTable.findFirst({
        where: eq(timetableVersionTable.version_id, id),
        with: { 
            lessons: { 
                with: { 
                    slot: true, 
                    class: true, 
                    subject: true, 
                    teacher: { columns: { full_name: true, user_id: true, email: true } }, 
                    venue: true 
                },
            } 
        }
    });
    if (!version) throw new NotFoundException(`Timetable version with ID ${id} not found.`);
    version.lessons.sort((a: any, b: any) => {
        if (a.slot.day_of_week !== b.slot.day_of_week) return a.slot.day_of_week - b.slot.day_of_week;
        return a.slot.start_time.localeCompare(b.slot.start_time);
    });
    return version;
  }

  async findAllVersionsForTerm(termId: number): Promise<TTimetableVersionSelect[]> {
      return this.db.query.timetableVersionTable.findMany({
          where: and(eq(timetableVersionTable.term_id, termId), isNull(timetableVersionTable.archived_at)),
          orderBy: (v, { desc }) => [desc(v.created_at)]
      });
  }

  async publishVersion(id: number): Promise<TTimetableVersionSelect> {
      const versionToPublish = await this.findVersionWithLessons(id);
      if (versionToPublish.status === 'published') return versionToPublish;
      let publishedVersion: TTimetableVersionSelect;
      await this.db.transaction(async (tx) => {
        await tx.update(timetableVersionTable).set({ status: 'archived', archived_at: new Date() }).where(and(
            eq(timetableVersionTable.term_id, versionToPublish.term_id),
            eq(timetableVersionTable.status, 'published'),
            eq(timetableVersionTable.timetable_type, versionToPublish.timetable_type),
            ne(timetableVersionTable.version_id, id)
        ));
        [publishedVersion] = await tx.update(timetableVersionTable)
            .set({ status: 'published', published_at: new Date() })
            .where(eq(timetableVersionTable.version_id, id))
            .returning();
      });
      this.distributeTimetable(id).catch(err => this.logger.error(`Failed to distribute timetable for version ${id}.`, err.stack));
      return publishedVersion!;
  }

  async archiveVersion(id: number): Promise<TTimetableVersionSelect> {
      await this.findVersionWithLessons(id);
      const [archived] = await this.db.update(timetableVersionTable)
          .set({ status: 'archived', archived_at: new Date() })
          .where(eq(timetableVersionTable.version_id, id)).returning();
      return archived;
  }
  
  async cloneVersion(sourceVersionId: number, newName: string, created_by_user_id: number): Promise<TTimetableVersionSelect> {
      this.logger.log(`Cloning timetable version ID: ${sourceVersionId} to new name: "${newName}"`);
      const sourceVersion = await this.findVersionWithLessons(sourceVersionId);

      const newVersionDto: CreateTimetableVersionDto = {
          term_id: sourceVersion.term_id,
          name: newName,
          description: `Cloned from "${sourceVersion.name}" on ${new Date().toISOString()}`,
          timetable_type: sourceVersion.timetable_type,
      };
      const newVersion = await this.createVersion(newVersionDto, created_by_user_id);

      if (sourceVersion.lessons && sourceVersion.lessons.length > 0) {
          const lessonsToClone = sourceVersion.lessons.map((lesson: any) => ({
              timetable_version_id: newVersion.version_id,
              slot_id: lesson.slot_id, class_id: lesson.class_id, subject_id: lesson.subject_id,
              teacher_id: lesson.teacher_id, venue_id: lesson.venue_id,
          }));
          await this.db.insert(lessonTable).values(lessonsToClone);
      }
      this.logger.log(`Successfully cloned version. New version ID: ${newVersion.version_id}`);
      return newVersion;
  }

  // ========================================================================
  // MANUAL LESSON MANAGEMENT
  // ========================================================================
  async addLesson(dto: CreateLessonDto): Promise<TLessonSelect> {
      const version = await this.findVersionWithLessons(dto.timetable_version_id);
      if (version.status !== 'draft') {
          throw new BadRequestException('Cannot add lessons to a non-draft timetable. Create a new draft first.');
      }
      
      const { slot_id, teacher_id, class_id, subject_id, venue_id } = dto;
      
      const allPublishedLessonsInTerm = (await this.db.query.timetableVersionTable.findMany({
          where: and(eq(timetableVersionTable.term_id, version.term_id), eq(timetableVersionTable.status, 'published')),
          with: { lessons: true }
      })).flatMap(v => v.lessons);
      
      const allScheduledLessonsInSlot = [...version.lessons, ...allPublishedLessonsInTerm].filter((l: any) => l.slot_id === slot_id);

      if (allScheduledLessonsInSlot.some((l: any) => l.teacher_id === teacher_id)) {
          throw new ConflictException(`Teacher ID ${teacher_id} is already scheduled in this time slot (in this draft or a published timetable).`);
      }
      if (allScheduledLessonsInSlot.some((l: any) => l.class_id === class_id)) {
          throw new ConflictException(`Class ID ${class_id} is already scheduled in this time slot (in this draft or a published timetable).`);
      }
      if (venue_id && allScheduledLessonsInSlot.some((l: any) => l.venue_id === venue_id)) {
          throw new ConflictException(`Venue ID ${venue_id} is already occupied in this time slot (in this draft or a published timetable).`);
      }
      
      const assignment = await this.db.query.teacherSubjectAssignmentTable.findFirst({
          where: and(eq(teacherSubjectAssignmentTable.teacher_id, teacher_id), eq(teacherSubjectAssignmentTable.subject_id, subject_id), eq(teacherSubjectAssignmentTable.class_id, class_id))
      });
      if (!assignment) {
          throw new BadRequestException(`Teacher (ID ${teacher_id}) is not assigned to teach subject (ID ${subject_id}) to class (ID ${class_id}).`);
      }

      const [newLesson] = await this.db.insert(lessonTable).values(dto).returning();
      return newLesson;
  }
  
  async removeLesson(lessonId: number): Promise<{ message: string }> {
      const lesson = await this.db.query.lessonTable.findFirst({ where: eq(lessonTable.lesson_id, lessonId), with: { timetableVersion: true } });
      if (!lesson) throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
      if (lesson.timetableVersion.status !== 'draft') {
          throw new BadRequestException('Cannot remove a lesson from a non-draft (published or archived) timetable.');
      }

      await this.db.delete(lessonTable).where(eq(lessonTable.lesson_id, lessonId));
      return { message: `Lesson with ID ${lessonId} has been successfully removed.`};
  }
  
  async findLessonById(lessonId: number): Promise<any> {
    const lesson = await this.db.query.lessonTable.findFirst({
        where: eq(lessonTable.lesson_id, lessonId),
        with: { slot: true, class: true, subject: true, teacher: {columns: {full_name: true}}, venue: true, timetableVersion: true }
    });
    if (!lesson) throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
    return lesson;
  }

  // ========================================================================
  // AUTOMATED TIMETABLE GENERATION ENGINE
  // ========================================================================
  async generateTimetable(versionId: number): Promise<{ message: string; conflicts: string[]; score: number; placedLessons: number; totalLessons: number; }> {
    this.logger.log(`[GENERATOR] Starting timetable generation for version ID: ${versionId}`);
    const version = await this.findVersionWithLessons(versionId);
    if (version.status !== 'draft') {
        throw new BadRequestException('Can only generate lessons for a timetable version in "draft" status.');
    }

    // === STEP 1: GATHER ALL CONSTRAINTS AND INPUTS ===
    this.logger.log('[GENERATOR] Step 1: Gathering all constraints...');
    const termId = version.term_id;
    const term = await this.termsService.findOne(termId, { with: { academicYear: true } });
    const schoolId = term.academicYear.school_id;

    const [requirements, allTeacherAssignments, allSlots, allVenues, teacherPreferencesMatrix] = await Promise.all([
      this.subjectRequirementsService.findAllForTerm(termId),
      this.db.query.teacherSubjectAssignmentTable.findMany({ with: { class: true } }),
      this.slotsService.findAllForSchool(schoolId),
      this.venuesService.findAllForSchool(schoolId),
      this.teacherPreferencesService.getSchoolWideAvailabilityMatrix(termId)
    ]);
    const teacherAssignments = allTeacherAssignments.filter((a: any) => a.class.school_id === schoolId);

    if (requirements.length === 0) throw new BadRequestException('Cannot generate: No subject requirements have been set for this term.');
    
    // === STEP 2: CREATE THE LIST OF LESSONS TO BE SCHEDULED ===
    this.logger.log('[GENERATOR] Step 2: Creating list of unscheduled lessons...');
    let unscheduledLessons: UnscheduledLesson[] = [];
    for (const req of requirements) {
        const assignmentsForSubjectClass = teacherAssignments.filter((a: any) => a.class_id === req.class_id && a.subject_id === req.subject_id);
        if (assignmentsForSubjectClass.length === 0) throw new ConflictException(`Cannot generate: No teacher assigned to subject ID ${req.subject_id} in class ID ${req.class_id}.`);
        const teacher_id = assignmentsForSubjectClass[0].teacher_id;
        for (let i = 0; i < req.lessons_per_week; i++) {
            unscheduledLessons.push({
                class_id: req.class_id, subject_id: req.subject_id, teacher_id,
                requires_venue_type: req.requires_specific_venue_type, is_double_period: req.is_double_period,
                lesson_key: `C${req.class_id}-S${req.subject_id}-#${i+1}`
            });
        }
    }
    unscheduledLessons.sort((a, b) => ((b.is_double_period ? 1 : 0) || (b.requires_venue_type ? 1 : 0)) - ((a.is_double_period ? 1 : 0) || (a.requires_venue_type ? 1 : 0)));
    this.logger.log(`[GENERATOR] Generated ${unscheduledLessons.length} lesson instances to schedule.`);

    // === STEP 3: RUN THE BACKTRACKING SOLVER ===
    this.logger.log('[GENERATOR] Step 3: Running the backtracking solver...');
    const scheduledLessons: Omit<TLessonSelect, 'lesson_id' | 'timetable_version_id'>[] = [];
    const conflicts: string[] = [];
    const teacherSchedule = new Set<string>();
    const classSchedule = new Set<string>();
    const venueSchedule = new Set<string>();

    const solve = (lessonIndex: number): boolean => {
        if (lessonIndex >= unscheduledLessons.length) return true;
        const lesson = unscheduledLessons[lessonIndex];
        const shuffledSlots = [...allSlots].sort(() => Math.random() - 0.5);

        for (const slot of shuffledSlots) {
            const slotMatrix = teacherPreferencesMatrix.find((m: any) => m.slot_details.slot_id === slot.slot_id);
            const teacherStatus = slotMatrix?.teacher_availabilities.find((ta: any) => ta.teacher_id === lesson.teacher_id)?.status;
            if (teacherStatus === 'unavailable') continue;

            for (const venue of allVenues) {
                if (teacherSchedule.has(`${lesson.teacher_id}-${slot.slot_id}`)) continue;
                if (classSchedule.has(`${lesson.class_id}-${slot.slot_id}`)) continue;
                if (venueSchedule.has(`${venue.venue_id}-${slot.slot_id}`)) continue;
                if (lesson.requires_venue_type && venue.venue_type !== lesson.requires_venue_type) continue;
                
                const newLesson = { class_id: lesson.class_id, subject_id: lesson.subject_id, teacher_id: lesson.teacher_id, slot_id: slot.slot_id, venue_id: venue.venue_id };
                scheduledLessons.push(newLesson);
                teacherSchedule.add(`${lesson.teacher_id}-${slot.slot_id}`);
                classSchedule.add(`${lesson.class_id}-${slot.slot_id}`);
                venueSchedule.add(`${venue.venue_id}-${slot.slot_id}`);

                if (solve(lessonIndex + 1)) return true;

                scheduledLessons.pop();
                teacherSchedule.delete(`${lesson.teacher_id}-${slot.slot_id}`);
                classSchedule.delete(`${lesson.class_id}-${slot.slot_id}`);
                venueSchedule.delete(`${venue.venue_id}-${slot.slot_id}`);
            }
        }
        
        conflicts.push(`Could not place: Lesson ${lesson.lesson_key}`);
        return false;
    };
    solve(0);

    // === STEP 4: SAVE THE RESULT AND CALCULATE SCORE ===
    this.logger.log('[GENERATOR] Step 4: Saving results and calculating score...');
    let score = 0;
    if (scheduledLessons.length > 0) {
        await this.db.transaction(async (tx) => {
            await tx.delete(lessonTable).where(eq(lessonTable.timetable_version_id, versionId));
            const lessonsToInsert = scheduledLessons.map(l => ({ ...l, timetable_version_id: versionId }));
            await tx.insert(lessonTable).values(lessonsToInsert);
        });
        for (const lesson of scheduledLessons) {
            const slotMatrix = teacherPreferencesMatrix.find((m: any) => m.slot_details.slot_id === lesson.slot_id);
            const teacherStatus = slotMatrix?.teacher_availabilities.find((ta: any) => ta.teacher_id === lesson.teacher_id)?.status;
            if (teacherStatus === 'preferred') score += 10; else score += 5;
        }
    }
    
    const result = {
        message: conflicts.length === 0 ? "Timetable generated successfully!" : `Timetable generated with ${conflicts.length} conflicts. Some lessons could not be placed.`,
        conflicts, score, placedLessons: scheduledLessons.length, totalLessons: unscheduledLessons.length,
    };
    this.logger.log(`[GENERATOR] Generation complete for version ID: ${versionId}.`, result);
    return result;
  }

  // ========================================================================
  // DISTRIBUTION & PERSONALIZED VIEWS
  // ========================================================================
  async getPublishedTimetableForClass(classId: number): Promise<any[]> {
    const publishedVersions = await this.db.query.timetableVersionTable.findMany({
        where: eq(timetableVersionTable.status, 'published'),
        with: { lessons: { where: eq(lessonTable.class_id, classId), with: { slot: true, subject: true, teacher: {columns: {full_name: true}}, venue: true } } }
    });
    const allLessons = publishedVersions.flatMap(v => v.lessons);
    return allLessons.sort((a,b) => {
        if (a.slot.day_of_week !== b.slot.day_of_week) return a.slot.day_of_week - b.slot.day_of_week;
        return a.slot.start_time.localeCompare(b.slot.start_time);
    });
  }
  
  async getPublishedTimetableForTeacher(teacherId: number): Promise<any[]> {
    const publishedVersions = await this.db.query.timetableVersionTable.findMany({
        where: eq(timetableVersionTable.status, 'published'),
        with: { lessons: { where: eq(lessonTable.teacher_id, teacherId), with: { slot: true, subject: true, class: true, venue: true } } }
    });
    const allLessons = publishedVersions.flatMap(v => v.lessons);
    return allLessons.sort((a,b) => {
        if (a.slot.day_of_week !== b.slot.day_of_week) return a.slot.day_of_week - b.slot.day_of_week;
        return a.slot.start_time.localeCompare(b.slot.start_time);
    });
  }
  
  async getPublishedTimetableForStudent(studentId: number): Promise<any[]> {
      const enrollment = await this.studentEnrollmentsService.findActiveEnrollmentForStudent(studentId);
      if (!enrollment) {
        this.logger.warn(`No active enrollment found for student ID ${studentId} when fetching timetable.`);
        return [];
      }
      return this.getPublishedTimetableForClass(enrollment.class_id);
  }

  async getPublishedTimetableForUser(userId: number, termId: number): Promise<any> {
      const user = await this.usersService.findOne(userId);
      if (!user) throw new NotFoundException(`User with ID ${userId} not found.`);

      const response: { [key: string]: any } = {
          user_id: userId,
          full_name: user.full_name,
          timetables: {}
      };

      if (user.roles.some((r: UserRole) => r.role === 'teacher')) {
          const teacherTimetable = await this.getPublishedTimetableForTeacher(userId);
          if (teacherTimetable.length > 0) {
            response.timetables.teacher_schedule = teacherTimetable;
          }
      }

      const studentProfile = await this.db.query.studentTable.findFirst({ where: eq(studentTable.user_id, userId) });
      if (studentProfile) {
          const studentTimetable = await this.getPublishedTimetableForStudent(studentProfile.student_id);
          if (studentTimetable.length > 0) {
            response.timetables.student_schedule = { student_id: studentProfile.student_id, lessons: studentTimetable };
          }
      }

      if (user.roles.some((r: UserRole) => r.role === 'parent')) {
          const parentLinks = await this.db.query.parentStudentLinkTable.findMany({
              where: eq(parentStudentLinkTable.parent_user_id, userId),
              with: { student: { with: { userAccount: true } } }
          });
          if (parentLinks.length > 0) {
              response.timetables.children_schedules = [];
              for (const link of parentLinks) {
                  const childTimetable = await this.getPublishedTimetableForStudent(link.student_id);
                  response.timetables.children_schedules.push({
                      student_id: link.student_id,
                      student_name: link.student.userAccount?.full_name || `Student #${link.student.admission_number}`,
                      lessons: childTimetable
                  });
              }
          }
      }
      
      return response;
  }
  
  private async distributeTimetable(versionId: number): Promise<void> {
    this.logger.log(`[DISTRIBUTION] Initiating distribution for timetable version ID: ${versionId}`);
    const timetable = await this.findVersionWithLessons(versionId);
    if (!timetable || timetable.status !== 'published') {
        this.logger.warn(`[DISTRIBUTION] Aborted: Timetable version ${versionId} is not published.`);
        return;
    }

    const teacherIds: number[] = [...new Set((timetable.lessons as any[]).map((l: any) => l.teacher_id))];
    if (teacherIds.length > 0) {
        const teachers = await this.db.query.userTable.findMany({ where: inArray(userTable.user_id, teacherIds) });
        for (const teacher of teachers) {
            this.logger.log(`- Would send timetable to teacher: ${teacher.email}`);
        }
    }

    const classIds: number[] = [...new Set((timetable.lessons as any[]).map((l: any) => l.class_id))];
    if (classIds.length > 0) {
        const enrollments = await this.studentEnrollmentsService.findAllByClassIds(classIds);
        for (const enrollment of enrollments) {
            const student = enrollment.student;
            if (student.userAccount?.email) {
                this.logger.log(`- Would send timetable to student: ${student.userAccount.email}`);
            }
            for (const parentLink of student.parentLinks) {
                if (parentLink.parent?.email) {
                    this.logger.log(`- Would send timetable to parent: ${parentLink.parent.email}`);
                }
            }
        }
    }
    this.logger.log('[DISTRIBUTION] Distribution process complete.');
  }

  // ========================================================================
  // ADVANCED ANALYTICAL QUERIES
  // ========================================================================
// Add this entire method inside your TimetablesService class

  /**
   * NEW SUPER QUERY: Finds published timetables for a term by searching for users.
   * This is a powerful administrative tool to quickly find anyone's schedule.
   * @param termId - The ID of the term to search within.
   * @param searchTerm - A string to search against user's full name or email.
   * @param schoolId - The ID of the school to limit the search to.
   * @returns A list of matching users, each with their relevant timetables.
   */
  async findPublishedTimetablesByUserDetails(termId: number, searchTerm: string, schoolId: number): Promise<any[]> {
      if (!searchTerm || searchTerm.trim().length < 3) {
          throw new BadRequestException('Search term must be at least 3 characters long.');
      }
      
      // Step 1: Find all matching users within the school who have relevant roles.
      const matchingUsers = await this.db.query.userTable.findMany({
          where: and(
              eq(userTable.school_id, schoolId),
              isNull(userTable.archived_at),
              or(
                  ilike(userTable.full_name, `%${searchTerm}%`),
                  ilike(userTable.email, `%${searchTerm}%`)
              )
          ),
          with: {
              roles: {
                  where: (roles, { inArray }) => inArray(roles.role, ['teacher', 'student', 'parent'])
              }
          }
      });

      // Filter out users who don't have one of the relevant roles after the query
      const relevantUsers = matchingUsers.filter(u => u.roles.length > 0);
      if (relevantUsers.length === 0) {
          return [];
      }

      // Step 2: For each matching user, get their personalized timetable for the specified term.
      const results = await Promise.all(relevantUsers.map(user => 
          this.getPublishedTimetableForUser(user.user_id, termId)
      ));

      // Step 3: Filter out any results that didn't have any timetables to return for that term.
      return results.filter(res => Object.keys(res.timetables).length > 0);
  }

  async findClashesInTerm(termId: number): Promise<any> {
      const publishedVersions = await this.db.query.timetableVersionTable.findMany({
          where: and(eq(timetableVersionTable.term_id, termId), eq(timetableVersionTable.status, 'published')),
          with: { lessons: true }
      });
      if (publishedVersions.length < 2) {
          return { message: "No potential for clashes. Only one or zero timetables are published for this term.", clashes: { teacher_clashes: [], class_clashes: []} };
      }
      
      const teacherClashes = new Map<string, any[]>();
      const classClashes = new Map<string, any[]>();
      const allLessons = publishedVersions.flatMap(v => v.lessons.map((l: any) => ({...l, version_name: v.name})));

      for (const lesson of allLessons) {
          const teacherKey = `${lesson.teacher_id}-${lesson.slot_id}`;
          const classKey = `${lesson.class_id}-${lesson.slot_id}`;
          
          if (!teacherClashes.has(teacherKey)) teacherClashes.set(teacherKey, []);
          teacherClashes.get(teacherKey)!.push(lesson);
          
          if (!classClashes.has(classKey)) classClashes.set(classKey, []);
          classClashes.get(classKey)!.push(lesson);
      }
      
      const formatClash = (clashArray: any[]) => clashArray.map((c: any) => `Lesson ID ${c.lesson_id} in Timetable "${c.version_name}"`);
      const clashes = {
          teacher_clashes: Array.from(teacherClashes.values()).filter(v => v.length > 1).map(formatClash),
          class_clashes: Array.from(classClashes.values()).filter(v => v.length > 1).map(formatClash),
      };

      return { message: `Found ${clashes.teacher_clashes.length} teacher clashes and ${clashes.class_clashes.length} class clashes.`, clashes };
  }

  async compareTimetableVersions(versionA_id: number, versionB_id: number): Promise<any> {
      const [versionA, versionB] = await Promise.all([
          this.findVersionWithLessons(versionA_id),
          this.findVersionWithLessons(versionB_id)
      ]);

      const lessonToKey = (l: any) => `${l.class_id}-${l.subject_id}-${l.teacher_id}-${l.slot_id}-${l.venue_id}`;
      const lessonsA = new Map(versionA.lessons.map((l: any) => [lessonToKey(l), l]));
      const lessonsB = new Map(versionB.lessons.map((l: any) => [lessonToKey(l), l]));
      
      const added = Array.from(lessonsB.keys()).filter(key => !lessonsA.has(key)).map(key => lessonsB.get(key));
      const removed = Array.from(lessonsA.keys()).filter(key => !lessonsB.has(key)).map(key => lessonsA.get(key));
      
      return {
          versionA: { id: versionA.version_id, name: versionA.name, lesson_count: lessonsA.size },
          versionB: { id: versionB.version_id, name: versionB.name, lesson_count: lessonsB.size },
          lessons_added_in_B: added,
          lessons_removed_from_A: removed,
      };
  }
  
  async findFreeSlots(termId: number, query: { teacherId?: number; classId?: number; venueId?: number }): Promise<any[]> {
      const term = await this.termsService.findOne(termId, { with: { academicYear: true } });
      const schoolId = term.academicYear.school_id;

      const allSlots = await this.slotsService.findAllForSchool(schoolId);
      const allPublishedLessons = (await this.db.query.timetableVersionTable.findMany({
          where: and(eq(timetableVersionTable.term_id, termId), eq(timetableVersionTable.status, 'published')),
          with: { lessons: true }
      })).flatMap(v => v.lessons);
      
      const busySlotIds = new Set<number>();
      
      for (const lesson of allPublishedLessons) {
          let isRelevant = false;
          if (query.teacherId && lesson.teacher_id === query.teacherId) isRelevant = true;
          if (query.classId && lesson.class_id === query.classId) isRelevant = true;
          if (query.venueId && lesson.venue_id === query.venueId) isRelevant = true;
          if (!query.teacherId && !query.classId && !query.venueId) isRelevant = true; 
          
          if (isRelevant) {
              busySlotIds.add(lesson.slot_id);
          }
      }

      return allSlots.filter(slot => !busySlotIds.has(slot.slot_id));
  }
  
  async getVenueUtilizationReport(termId: number): Promise<any> {
    const term = await this.termsService.findOne(termId, { with: { academicYear: true } });
    const publishedVersion = await this.db.query.timetableVersionTable.findFirst({
        where: and(eq(timetableVersionTable.term_id, termId), eq(timetableVersionTable.status, 'published')),
        with: { lessons: true }
    });
    if (!publishedVersion) throw new NotFoundException('No published timetable found for this term.');

    const allVenues = await this.venuesService.findAllForSchool(term.academicYear.school_id);
    const totalSlots = (await this.slotsService.findAllForSchool(term.academicYear.school_id)).length;
    if (totalSlots === 0) return { message: "No timetable slots have been configured for this school." };

    return allVenues.map(venue => {
        const lessonsInVenue = publishedVersion.lessons.filter((l: any) => l.venue_id === venue.venue_id);
        const utilizationPercentage = (lessonsInVenue.length / totalSlots) * 100;
        return {
            venue_id: venue.venue_id, venue_name: venue.name, capacity: venue.capacity, venue_type: venue.venue_type,
            total_lessons_hosted: lessonsInVenue.length,
            utilization_percentage: parseFloat(utilizationPercentage.toFixed(2))
        };
    });
  }

  async getTeacherWorkloadReport(termId: number): Promise<any> {
    const term = await this.termsService.findOne(termId, { with: { academicYear: true } });
    const publishedVersion = await this.db.query.timetableVersionTable.findFirst({
        where: and(eq(timetableVersionTable.term_id, termId), eq(timetableVersionTable.status, 'published')),
        with: { lessons: true }
    });
    if (!publishedVersion) throw new NotFoundException('No published timetable found for this term.');

    const schoolId = term.academicYear.school_id;
    const allTeachers = await this.usersService.findAllBySchool(schoolId, { withRole: 'teacher' });

    return allTeachers.map((teacher: TUserSelect) => {
        const lessonsTaught = publishedVersion.lessons.filter((l: any) => l.teacher_id === teacher.user_id);
        return {
            teacher_id: teacher.user_id,
            teacher_name: teacher.full_name,
            total_lessons_assigned: lessonsTaught.length
        };
    }).sort((a,b) => b.total_lessons_assigned - a.total_lessons_assigned);
  }
}