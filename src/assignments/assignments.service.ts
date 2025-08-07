import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { assignmentTable, studentSubmissionTable, TAssignmentSelect, TStudentSubmissionSelect } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { LessonContentsService } from '../lesson-contents/lesson-contents.service';
import { StudentsService } from '../students/students.service';

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly lessonContentsService: LessonContentsService,
    private readonly studentsService: StudentsService,
  ) {}

  // --- Assignment Management ---

  async create(createDto: CreateAssignmentDto): Promise<TAssignmentSelect> {
    const { content_id } = createDto;

    // Validation 1: Ensure the parent lessonContent item exists and is of type 'assignment'.
    const content = await this.lessonContentsService.findOne(content_id);
    if (content.content_type !== 'assignment') {
      throw new BadRequestException(`Content with ID ${content_id} is not of type 'assignment'.`);
    }

    // Validation 2: Ensure an assignment isn't already linked to this content item.
    const existingAssignment = await this.db.query.assignmentTable.findFirst({
        where: eq(assignmentTable.content_id, content_id)
    });
    if (existingAssignment) {
      throw new ConflictException(`An assignment is already linked to content ID ${content_id}.`);
    }
    
    const dataToInsert = { ...createDto, due_date: createDto.due_date ? new Date(createDto.due_date) : null };
    const [newAssignment] = await this.db.insert(assignmentTable).values(dataToInsert).returning();
    return newAssignment;
  }

  async findOne(id: number): Promise<any> {
    const assignment = await this.db.query.assignmentTable.findFirst({
        where: eq(assignmentTable.assignment_id, id),
        with: {
            lessonContent: true, // Show the parent content details
            submissions: true,   // Show all student submissions for this assignment
        }
    });
    if (!assignment) {
        throw new NotFoundException(`Assignment with ID ${id} not found.`);
    }
    return assignment;
  }

  // --- Submission Management ---
  
  async createSubmission(createDto: CreateSubmissionDto): Promise<TStudentSubmissionSelect> {
    const { assignment_id, student_id } = createDto;

    // Validation 1: Ensure both the assignment and the student exist.
    const [assignment, student] = await Promise.all([
        this.findOne(assignment_id),
        this.studentsService.findOne(student_id)
    ]).catch(err => {
        throw new BadRequestException(`Invalid assignment or student ID: ${err.message}`);
    });

    // Validation 2: Prevent duplicate submissions.
    const existingSubmission = await this.db.query.studentSubmissionTable.findFirst({
        where: and(
            eq(studentSubmissionTable.assignment_id, assignment_id),
            eq(studentSubmissionTable.student_id, student_id)
        )
    });
    if (existingSubmission) {
      throw new ConflictException(`Student with ID ${student_id} has already submitted to this assignment.`);
    }

    // TODO: Add logic to check if student is enrolled in the course of this assignment.

    const [newSubmission] = await this.db.insert(studentSubmissionTable).values(createDto).returning();
    return newSubmission;
  }

  async findOneSubmission(submissionId: number): Promise<any> {
      const submission = await this.db.query.studentSubmissionTable.findFirst({
          where: eq(studentSubmissionTable.submission_id, submissionId),
          with: { student: true, assignment: true }
      });
      if (!submission) throw new NotFoundException(`Submission with ID ${submissionId} not found.`);
      return submission;
  }

  async gradeSubmission(submissionId: number, gradeDto: GradeSubmissionDto): Promise<TStudentSubmissionSelect> {
      await this.findOneSubmission(submissionId); // Ensure submission exists

      const [gradedSubmission] = await this.db.update(studentSubmissionTable)
        .set(gradeDto)
        .where(eq(studentSubmissionTable.submission_id, submissionId))
        .returning();

      // Post-grading hook: e.g., create a notification for the student
      // this.notificationsService.create({ ... });

      return gradedSubmission;
  }
}