import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { courseTable, TCourseSelect } from '../drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { SubjectsService } from '../subjects/subjects.service';
import { UserService } from '../users/users.service';
import { AcademicYearService } from '../academic-years/academic-years.service';

interface UserRole { role: string; }

@Injectable()
export class CoursesService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly subjectsService: SubjectsService,
    private readonly usersService: UserService,
    private readonly academicYearsService: AcademicYearService,
  ) {}

  /**
   * Creates a new e-learning course.
   */
  async create(createDto: CreateCourseDto): Promise<TCourseSelect> {
    const { subject_id, teacher_id, academic_year_id, title } = createDto;

    // Validation 1: Ensure all referenced entities exist and are active.
    const [subject, teacher, academicYear] = await Promise.all([
        this.subjectsService.findOne(subject_id),
        this.usersService.findOne(teacher_id),
        academic_year_id ? this.academicYearsService.findOne(academic_year_id) : Promise.resolve(null),
    ]).catch(err => {
        throw new BadRequestException(`Invalid reference ID provided: ${err.message}`);
    });

    // Validation 2: Ensure the user is a teacher.
    if (!teacher.roles.some((r: UserRole) => r.role === 'teacher')) {
      throw new BadRequestException(`User with ID ${teacher_id} is not a registered teacher.`);
    }
    
    // Validation 3: Ensure all entities belong to the same school.
    const schoolId = subject.school_id;
    if (teacher.school_id !== schoolId || (academicYear && academicYear.school_id !== schoolId)) {
        throw new BadRequestException('The subject, teacher, and academic year must all belong to the same school.');
    }

    // Validation 4: Prevent duplicate course titles for the same subject and year.
    const existingCourse = await this.db.query.courseTable.findFirst({
        where: and(
            eq(courseTable.subject_id, subject_id),
            eq(courseTable.title, title),
            academic_year_id ? eq(courseTable.academic_year_id, academic_year_id) : isNull(courseTable.academic_year_id),
            isNull(courseTable.archived_at)
        )
    });
    if (existingCourse) {
        throw new ConflictException(`A course with the title "${title}" already exists for this subject in the specified academic year.`);
    }

    const [newCourse] = await this.db.insert(courseTable).values(createDto).returning();
    return newCourse;
  }

  /**
   * Retrieves a single course by its ID, including its modules and content.
   */
  async findOne(id: number): Promise<any> {
    const course = await this.db.query.courseTable.findFirst({
        where: eq(courseTable.course_id, id),
        with: {
            subject: true,
            teacher: { columns: { user_id: true, full_name: true } },
            academicYear: true,
            // Eagerly load the entire course structure, sorted correctly
            modules: {
                with: {
                    contents: {
                        orderBy: (c, { asc }) => [asc(c.order)]
                    }
                },
                orderBy: (m, { asc }) => [asc(m.order)]
            }
        }
    });
    if (!course) {
        throw new NotFoundException(`Course with ID ${id} not found.`);
    }
    return course;
  }
  
  /**
   * Finds all active courses for a specific teacher.
   */
  async findAllByTeacher(teacherId: number): Promise<TCourseSelect[]> {
      return this.db.query.courseTable.findMany({
          where: and(
              eq(courseTable.teacher_id, teacherId),
              isNull(courseTable.archived_at)
          ),
          with: { subject: true, academicYear: true }
      });
  }
  
  /**
   * Finds all active courses for a specific subject.
   */
  async findAllBySubject(subjectId: number): Promise<TCourseSelect[]> {
      return this.db.query.courseTable.findMany({
          where: and(
              eq(courseTable.subject_id, subjectId),
              isNull(courseTable.archived_at)
          ),
          with: { teacher: { columns: { user_id: true, full_name: true } }, academicYear: true }
      });
  }

  /**
   * Updates an existing course.
   */
  async update(id: number, updateDto: UpdateCourseDto): Promise<TCourseSelect> {
    await this.findOne(id); // Ensure course exists
    const [updatedCourse] = await this.db.update(courseTable).set(updateDto).where(eq(courseTable.course_id, id)).returning();
    return updatedCourse;
  }

  /**
   * Archives a course, making it inaccessible.
   */
  async archive(id: number): Promise<{ message: string }> {
    const course = await this.findOne(id);
    if (course.archived_at) {
        throw new BadRequestException(`Course with ID ${id} is already archived.`);
    }
    // Production Check: In a real system, you might check for active student progress before archiving.
    await this.db.update(courseTable).set({ archived_at: new Date() }).where(eq(courseTable.course_id, id));
    return { message: `Course with ID ${id} has been successfully archived.` };
  }
}