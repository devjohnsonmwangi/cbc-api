import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { teacherSubjectAssignmentTable, TTeacherSubjectAssignmentSelect } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { CreateTeacherAssignmentDto } from './dto/create-teacher-assignment.dto';
import { UserService } from '../users/users.service';
import { SubjectsService } from '../subjects/subjects.service';
import { ClassesService } from '../classes/classes.service';

@Injectable()
export class TeacherAssignmentsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly usersService: UserService,
    private readonly subjectsService: SubjectsService,
    private readonly classesService: ClassesService,
  ) {}

  async create(createDto: CreateTeacherAssignmentDto): Promise<TTeacherSubjectAssignmentSelect> {
    const { teacher_id, subject_id, class_id } = createDto;

    // Validation 1: Check for existing assignment to prevent duplicates.
    const existingAssignment = await this.db.query.teacherSubjectAssignmentTable.findFirst({
        where: and(
            eq(teacherSubjectAssignmentTable.teacher_id, teacher_id),
            eq(teacherSubjectAssignmentTable.subject_id, subject_id),
            eq(teacherSubjectAssignmentTable.class_id, class_id)
        ),
    });
    if (existingAssignment) {
        throw new ConflictException('This teacher is already assigned to this subject for this class.');
    }

    // Validation 2: Verify that all referenced entities exist.
    const [teacher, subject, classInfo] = await Promise.all([
        this.usersService.findOne(teacher_id),
        this.subjectsService.findOne(subject_id),
        this.classesService.findOne(class_id),
    ]).catch(err => {
        throw new BadRequestException(`Invalid reference ID provided: ${err.message}`);
    });

    // Validation 3: Ensure the user being assigned actually has the 'teacher' role.
    if (!teacher.roles.some((r: { role: string }) => r.role === 'teacher')) {
        throw new BadRequestException(`User with ID ${teacher_id} is not a teacher.`);
    }

    // Validation 4: Ensure the class and subject belong to the same school.
    if (subject.school_id !== classInfo.school_id) {
        throw new BadRequestException('The subject and class must belong to the same school.');
    }

    const [newAssignment] = await this.db.insert(teacherSubjectAssignmentTable).values(createDto).returning();
    return newAssignment;
  }

  async findOne(id: number): Promise<any> {
    const assignment = await this.db.query.teacherSubjectAssignmentTable.findFirst({
        where: eq(teacherSubjectAssignmentTable.assignment_id, id),
        with: { teacher: true, subject: true, class: true },
    });
    if (!assignment) {
        throw new NotFoundException(`Assignment with ID ${id} not found.`);
    }
    return assignment;
  }

  async findAllByTeacher(teacherId: number): Promise<any[]> {
    await this.usersService.findOne(teacherId); // Validate teacher exists
    return this.db.query.teacherSubjectAssignmentTable.findMany({
        where: eq(teacherSubjectAssignmentTable.teacher_id, teacherId),
        with: { subject: true, class: true },
    });
  }

  async delete(id: number): Promise<{ message: string }> {
      await this.findOne(id); // Ensure it exists before deleting
      await this.db.delete(teacherSubjectAssignmentTable).where(eq(teacherSubjectAssignmentTable.assignment_id, id));
      return { message: `Assignment with ID ${id} has been successfully deleted.` };
  }
}