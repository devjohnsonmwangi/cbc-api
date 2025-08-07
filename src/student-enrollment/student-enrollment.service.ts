import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { studentEnrollmentTable, TStudentEnrollmentSelect, studentTable, termTable, academicYearTable } from '../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { CreateEnrollmentDto } from './dto/create-student-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-student-enrollment.dto';
import { StudentsService } from '../students/students.service';
import { ClassesService } from '../classes/classes.service';
import { AcademicYearService } from '../academic-years/academic-years.service';

/**
 * Manages the enrollment of students into classes for specific academic years.
 * This service is a critical link between students, classes, and the academic calendar.
 */
@Injectable()
export class StudentEnrollmentsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly studentsService: StudentsService,
    private readonly classesService: ClassesService,
    private readonly academicYearsService: AcademicYearService,
  ) {}

  /**
   * Enrolls a student into a class for a given academic year.
   * @param createDto - The enrollment details.
   * @returns The newly created enrollment record.
   */
  async create(createDto: CreateEnrollmentDto): Promise<TStudentEnrollmentSelect> {
    const { student_id, class_id, academic_year_id } = createDto;

    const existingEnrollment = await this.db.query.studentEnrollmentTable.findFirst({
        where: and(
            eq(studentEnrollmentTable.student_id, student_id),
            eq(studentEnrollmentTable.academic_year_id, academic_year_id),
        ),
    });
    if (existingEnrollment) {
        throw new ConflictException(`Student with ID ${student_id} is already enrolled in a class for this academic year.`);
    }

    const [student, classInfo, academicYear] = await Promise.all([
        this.studentsService.findOne(student_id),
        this.classesService.findOne(class_id),
        this.academicYearsService.findOne(academic_year_id),
    ]).catch(err => {
        throw new BadRequestException(`Invalid reference ID provided: ${err.message}`);
    });

    if (!(student.school_id === classInfo.school_id && classInfo.school_id === academicYear.school_id)) {
        throw new BadRequestException('The school of the student, class, and academic year must all be the same.');
    }

    const [newEnrollment] = await this.db.insert(studentEnrollmentTable).values(createDto).returning();
    return newEnrollment;
  }

  /**
   * Retrieves a single enrollment record by its ID with full relational details.
   * @param id - The ID of the enrollment.
   * @returns The full enrollment object.
   */
  async findOne(id: number): Promise<any> {
    const enrollment = await this.db.query.studentEnrollmentTable.findFirst({
        where: eq(studentEnrollmentTable.enrollment_id, id),
        with: { 
            student: true, 
            class: { with: { classTeacher: true } }, 
            academicYear: true 
        }
    });
    if (!enrollment) {
        throw new NotFoundException(`Enrollment with ID ${id} not found.`);
    }
    return enrollment;
  }

  /**
   * Finds all students enrolled in a specific class for the current or a specified academic year.
   * @param classId - The ID of the class.
   * @param academicYearId - Optional: The ID of the academic year. If not provided, it will try to find the current active year.
   * @returns A sorted list of enrollment records.
   */
  async findAllByClass(classId: number, academicYearId?: number): Promise<any[]> {
    const classInfo = await this.classesService.findOne(classId);

    let targetYearId = academicYearId;
    if (!targetYearId) {
        // Advanced logic: if no year is specified, find the currently active academic year for the class's school.
        const now = new Date();
        const activeYear = await this.db.query.academicYearTable.findFirst({
            where: and(
                eq(academicYearTable.school_id, classInfo.school_id),
                // lte(academicYearTable.start_date, now),
                // gte(academicYearTable.end_date, now)
            )
        });
        if (!activeYear) throw new NotFoundException('Could not determine the current active academic year for this school.');
        targetYearId = activeYear.year_id;
    }

    const enrollments = await this.db.query.studentEnrollmentTable.findMany({
        where: and(
            eq(studentEnrollmentTable.class_id, classId),
            eq(studentEnrollmentTable.academic_year_id, targetYearId)
        ),
        with: { 
            student: { with: { userAccount: true } } 
        },
    });

    return enrollments.sort((a, b) => {
        const nameA = a.student?.userAccount?.full_name || a.student?.admission_number || '';
        const nameB = b.student?.userAccount?.full_name || b.student?.admission_number || '';
        return nameA.localeCompare(nameB);
    });
  }

  /**
   * **NEW METHOD:** Finds all enrollments for a given list of class IDs.
   * This is a utility method for services like TimetablesService to gather data in bulk.
   * @param classIds - An array of class IDs.
   * @returns A list of all matching enrollment records with student and parent details.
   */
  async findAllByClassIds(classIds: number[]): Promise<any[]> {
      if (!classIds || classIds.length === 0) {
        return [];
      }
      return this.db.query.studentEnrollmentTable.findMany({
          where: inArray(studentEnrollmentTable.class_id, classIds),
          with: { 
              student: { 
                  with: { 
                      userAccount: true, 
                      parentLinks: { with: { parent: { columns: { email: true, full_name: true, user_id: true } } } }
                  } 
              } 
          }
      });
  }

  /**
   * **NEW METHOD:** Finds the single active enrollment for a student.
   * This is crucial for determining a student's current class for timetable lookups.
   * @param studentId - The ID of the student.
   * @returns The active enrollment record or null if not found.
   */
  async findActiveEnrollmentForStudent(studentId: number): Promise<any> {
    // This query finds the enrollment for the student in the most recent academic year.
    // A more complex system might check against the current date.
    const activeEnrollment = await this.db.query.studentEnrollmentTable.findFirst({
        where: and(
            eq(studentEnrollmentTable.student_id, studentId),
            eq(studentEnrollmentTable.status, 'active')
        ),
        with: {
            class: true,
            academicYear: true
        },
        orderBy: (enrollments, { desc }) => [desc(enrollments.academic_year_id)]
    });
    return activeEnrollment;
  }

  /**
   * Updates an enrollment record (e.g., to change status or transfer a student to a new class).
   * @param id - The ID of the enrollment record to update.
   * @param updateDto - The data to update.
   * @returns The updated enrollment record.
   */
  async update(id: number, updateDto: UpdateEnrollmentDto): Promise<TStudentEnrollmentSelect> {
    const enrollment = await this.findOne(id);

    if (updateDto.class_id && updateDto.class_id !== enrollment.class_id) {
        const newClass = await this.classesService.findOne(updateDto.class_id);
        if (newClass.school_id !== enrollment.academicYear.school_id) {
            throw new BadRequestException("Cannot transfer student to a class in a different school.");
        }
    }

    const [updatedEnrollment] = await this.db
        .update(studentEnrollmentTable)
        .set(updateDto)
        .where(eq(studentEnrollmentTable.enrollment_id, id))
        .returning();
    return updatedEnrollment;
  }

  /**
   * Deletes an enrollment record.
   * @warning This is a destructive action. In many systems, changing the status to 'withdrawn' is preferred.
   * @param id - The ID of the enrollment record to delete.
   * @returns A confirmation message.
   */
  async delete(id: number): Promise<{ message: string }> {
      await this.findOne(id);
      // Production Check: Before deleting, you might want to check for dependent records like assessments.
      await this.db.delete(studentEnrollmentTable).where(eq(studentEnrollmentTable.enrollment_id, id));
      return { message: `Enrollment record with ID ${id} has been successfully deleted.` };
  }
}