import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
// FIX: Added studentTable for sorting reference
import { studentEnrollmentTable, TStudentEnrollmentSelect, studentTable } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { CreateEnrollmentDto } from './dto/create-student-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-student-enrollment.dto';
import { StudentsService } from '../students/students.service';
import { ClassesService } from '../classes/classes.service';
import { AcademicYearService } from '../academic-years/academic-years.service';

@Injectable()
export class StudentEnrollmentsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly studentsService: StudentsService,
    private readonly classesService: ClassesService,
    private readonly academicYearsService: AcademicYearService,
  ) {}

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

  async findOne(id: number): Promise<any> { // Return type 'any' to accommodate relations
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

  async findAllByClass(classId: number): Promise<any[]> {
    await this.classesService.findOne(classId); // Validate class exists

    const enrollments = await this.db.query.studentEnrollmentTable.findMany({
        where: eq(studentEnrollmentTable.class_id, classId),
        with: { 
            student: { with: { userAccount: true } } // Eagerly load student details and userAccount
        },
    });

    // FIX 1: Sort the results in-memory after fetching from the database.
    // This is the recommended approach when you need to sort by a related table's property.
    return enrollments.sort((a, b) => {
        // Handle cases where student might be null or name is null
        const nameA = a.student?.userAccount?.full_name || '';
        const nameB = b.student?.userAccount?.full_name || '';
        return nameA.localeCompare(nameB);
    });
  }

  async update(id: number, updateDto: UpdateEnrollmentDto): Promise<TStudentEnrollmentSelect> {
    // FIX 2: Ensure the `findOne` call here fetches the necessary relations for validation.
    const enrollment = await this.findOne(id); // This now fetches relations correctly.

    if (updateDto.class_id && updateDto.class_id !== enrollment.class_id) {
        const newClass = await this.classesService.findOne(updateDto.class_id);
        // The `enrollment` object now correctly has the `academicYear` property.
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

  async delete(id: number): Promise<{ message: string }> {
      await this.findOne(id);
      await this.db.delete(studentEnrollmentTable).where(eq(studentEnrollmentTable.enrollment_id, id));
      return { message: `Enrollment record with ID ${id} has been successfully deleted.` };
  }
}