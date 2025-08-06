import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { studentTable, parentStudentLinkTable, TStudentSelect } from '../drizzle/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { SchoolService } from '../schools/schools.service';
import { UserService } from '../users/users.service';

@Injectable()
export class StudentsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly schoolService: SchoolService,
    private readonly userService: UserService,
  ) {}

  async create(createDto: CreateStudentDto): Promise<TStudentSelect> {
    const { school_id, admission_number, upi, user_id } = createDto;

    // Validation 1: Ensure parent school exists and is active.
    await this.schoolService.findOne(school_id);

    // Validation 2: If a user account is linked, ensure it exists and is not already linked to another student.
    if (user_id) {
        await this.userService.findOne(user_id);
        const existingLink = await this.db.query.studentTable.findFirst({ where: eq(studentTable.user_id, user_id) });
        if (existingLink) {
            throw new ConflictException(`User with ID ${user_id} is already linked to another student.`);
        }
    }

    // Validation 3: Check for uniqueness of admission_number (per school) and UPI (globally).
    const conflictChecks = [eq(studentTable.admission_number, admission_number)];
    if (upi) {
        conflictChecks.push(eq(studentTable.upi, upi));
    }
    const existingStudent = await this.db.query.studentTable.findFirst({
        where: and(
            eq(studentTable.school_id, school_id),
            isNull(studentTable.archived_at),
            or(...conflictChecks)
        ),
    });
    if (existingStudent) {
        if (existingStudent.admission_number === admission_number) {
            throw new ConflictException(`A student with admission number "${admission_number}" already exists in this school.`);
        }
        if (upi && existingStudent.upi === upi) {
            throw new ConflictException(`A student with UPI "${upi}" already exists.`);
        }
    }

    const dataToInsert = {
        ...createDto,
        date_of_birth: createDto.date_of_birth ? new Date(createDto.date_of_birth) : null,
    };

    const [newStudent] = await this.db.insert(studentTable).values(dataToInsert).returning();
    return newStudent;
  }

  async findOne(id: number): Promise<TStudentSelect> {
    const student = await this.db.query.studentTable.findFirst({
      where: eq(studentTable.student_id, id),
      with: { parentLinks: { with: { parent: true } } } // Eagerly load parents
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found.`);
    }
    return student;
  }

  async findAllForSchool(schoolId: number): Promise<TStudentSelect[]> {
    await this.schoolService.findOne(schoolId);
    return this.db.query.studentTable.findMany({
        where: and(eq(studentTable.school_id, schoolId), isNull(studentTable.archived_at)),
        orderBy: (students, { asc }) => [asc(students.admission_number)],
    });
  }

  async update(id: number, updateDto: UpdateStudentDto): Promise<TStudentSelect> {
    await this.findOne(id);
    const dataToUpdate: { [key: string]: any } = { ...updateDto };
    if (updateDto.date_of_birth) dataToUpdate.date_of_birth = new Date(updateDto.date_of_birth);

    const [updatedStudent] = await this.db
        .update(studentTable)
        .set(dataToUpdate)
        .where(eq(studentTable.student_id, id))
        .returning();
    return updatedStudent;
  }
  
  async archive(id: number): Promise<{ message: string }> {
    const student = await this.findOne(id);
    if (student.archived_at) {
        throw new BadRequestException(`Student with ID ${id} is already archived.`);
    }
    // TODO: Add checks for active enrollments, etc., before archiving.
    await this.db.update(studentTable).set({ archived_at: new Date() }).where(eq(studentTable.student_id, id));
    return { message: `Student with ID ${id} has been successfully archived.` };
  }

  // --- Parent Linking Logic ---

  async linkParent(studentId: number, parentUserId: number): Promise<{ message: string }> {
    // 1. Verify both student and parent exist
    const [student, parent] = await Promise.all([
        this.findOne(studentId),
        this.userService.findOne(parentUserId),
    ]);
    
    // 2. Verify parent has the 'parent' role
    if (!parent.roles.some((r: { role: string }) => r.role === 'parent')) {
        throw new BadRequestException(`User with ID ${parentUserId} does not have the 'parent' role.`);
    }

    // 3. Check if link already exists
    const existingLink = await this.db.query.parentStudentLinkTable.findFirst({
        where: and(
            eq(parentStudentLinkTable.student_id, studentId),
            eq(parentStudentLinkTable.parent_user_id, parentUserId)
        )
    });
    if (existingLink) {
        throw new ConflictException('This parent is already linked to this student.');
    }

    // 4. Create the link
    await this.db.insert(parentStudentLinkTable).values({ student_id: studentId, parent_user_id: parentUserId });
    return { message: `Successfully linked parent (ID: ${parentUserId}) to student (ID: ${studentId}).` };
  }
}