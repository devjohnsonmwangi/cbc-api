import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { assessmentTable, studentEnrollmentTable, teacherSubjectAssignmentTable, TAssessmentSelect, TStudentSelect } from '../drizzle/schema';
// FIX: Correctly import 'inArray' and other Drizzle operators
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
// FIX: Corrected import names from plural to singular
import { TermService } from '../terms/terms.service';
import { StudentsService } from '../students/students.service';
import { SubjectsService } from '../subjects/subjects.service';
import { UserService } from '../users/users.service';
import { ClassesService } from '../classes/classes.service';

// FIX: Define a type for the role object to prevent implicit 'any'
interface UserRole {
  role: string;
}

@Injectable()
export class AssessmentsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly termsService: TermService,
    private readonly studentsService: StudentsService,
    private readonly subjectsService: SubjectsService,
    private readonly usersService: UserService,
    private readonly classesService: ClassesService,
  ) {}

  async create(createDto: CreateAssessmentDto): Promise<TAssessmentSelect> {
    const { term_id, student_id, subject_id, teacher_id, assessment_date } = createDto;

    const [term, student, subject, teacher] = await Promise.all([
        this.termsService.findOne(term_id),
        this.studentsService.findOne(student_id),
        this.subjectsService.findOne(subject_id),
        this.usersService.findOne(teacher_id),
    ]).catch(err => {
        throw new BadRequestException(`Invalid reference ID provided: ${err.message}`);
    });
    if (term.archived_at || student.archived_at || subject.archived_at || teacher.archived_at) {
        throw new BadRequestException('Cannot create an assessment with archived records.');
    }
    // FIX: Provide explicit type for 'r' in the callback
    if (!teacher.roles.some((r: UserRole) => r.role === 'teacher')) {
        throw new ForbiddenException(`User with ID ${teacher_id} is not a teacher.`);
    }
    if (student.school_id !== subject.school_id) {
        throw new BadRequestException('The student and subject must belong to the same school.');
    }
    const studentEnrollment = await this.db.query.studentEnrollmentTable.findFirst({
        where: and(eq(studentEnrollmentTable.student_id, student_id), eq(studentEnrollmentTable.academic_year_id, term.academic_year_id))
    });
    if (!studentEnrollment || studentEnrollment.status !== 'active') {
        throw new BadRequestException(`Student with ID ${student_id} is not actively enrolled in a class for this academic year.`);
    }
    const teacherAssignment = await this.db.query.teacherSubjectAssignmentTable.findFirst({
        where: and(eq(teacherSubjectAssignmentTable.teacher_id, teacher_id), eq(teacherSubjectAssignmentTable.subject_id, subject_id), eq(teacherSubjectAssignmentTable.class_id, studentEnrollment.class_id))
    });
    if (!teacherAssignment) {
        throw new ForbiddenException(`This teacher is not assigned to teach this subject to the student's class.`);
    }
    const dataToInsert = { ...createDto, assessment_date: assessment_date ? new Date(assessment_date) : new Date() };
    const [newAssessment] = await this.db.insert(assessmentTable).values(dataToInsert).returning();
    return newAssessment;
  }

  async findOne(id: number): Promise<any> {
    const assessment = await this.db.query.assessmentTable.findFirst({
        where: eq(assessmentTable.assessment_id, id),
        with: { term: true, student: true, subject: true, teacher: { columns: { user_id: true, full_name: true }} }
    });
    if (!assessment) {
        throw new NotFoundException(`Assessment with ID ${id} not found.`);
    }
    return assessment;
  }

  async findAllByTeacher(teacherId: number, termId: number): Promise<any[]> {
    await this.usersService.findOne(teacherId);
    await this.termsService.findOne(termId);
    return this.db.query.assessmentTable.findMany({
        where: and(eq(assessmentTable.teacher_id, teacherId), eq(assessmentTable.term_id, termId)),
        with: { student: true, subject: true },
        orderBy: [desc(assessmentTable.assessment_date)]
    });
  }

  async findAllBySubject(subjectId: number, termId: number): Promise<any[]> {
    await this.subjectsService.findOne(subjectId);
    await this.termsService.findOne(termId);
    return this.db.query.assessmentTable.findMany({
        where: and(eq(assessmentTable.subject_id, subjectId), eq(assessmentTable.term_id, termId)),
        with: { student: true, teacher: { columns: { user_id: true, full_name: true } } },
        orderBy: [desc(assessmentTable.score)]
    });
  }
  
  async findAllByClass(classId: number, termId: number): Promise<any[]> {
    const term = await this.termsService.findOne(termId);
    const enrollments = await this.db.query.studentEnrollmentTable.findMany({
        where: and(eq(studentEnrollmentTable.class_id, classId), eq(studentEnrollmentTable.academic_year_id, term.academic_year_id)),
        columns: { student_id: true }
    });
    const studentIds = enrollments.map(e => e.student_id);
    if (studentIds.length === 0) return [];
    
    return this.db.query.assessmentTable.findMany({
        // FIX: Correctly use the imported 'inArray' operator
        where: and(eq(assessmentTable.term_id, termId), inArray(assessmentTable.student_id, studentIds)),
        with: { student: true, subject: true },
    });
  }

  async generateStudentReportCard(studentId: number, termId: number): Promise<any> {
    await this.studentsService.findOne(studentId);
    await this.termsService.findOne(termId);
    const assessments = await this.db.query.assessmentTable.findMany({
        where: and(eq(assessmentTable.student_id, studentId), eq(assessmentTable.term_id, termId)),
        with: { subject: true },
        orderBy: [asc(assessmentTable.subject_id), asc(assessmentTable.assessment_date)]
    });
    if (assessments.length === 0) return { message: "No assessments found for this student in the specified term." };

    // FIX: Provide a typed initial value for the accumulator
    const report = assessments.reduce((acc: { [key: string]: any }, assessment) => {
        const subjectName = assessment.subject.subject_name;
        if (!acc[subjectName]) {
            acc[subjectName] = { subject_details: assessment.subject, assessments: [] };
        }
        const { subject, ...rest } = assessment;
        acc[subjectName].assessments.push(rest);
        return acc;
    }, {});
    return report;
  }

  async generateClassSubjectReport(classId: number, subjectId: number, termId: number): Promise<any> {
    const term = await this.termsService.findOne(termId);
    const enrollments = await this.db.query.studentEnrollmentTable.findMany({
        where: and(eq(studentEnrollmentTable.class_id, classId), eq(studentEnrollmentTable.academic_year_id, term.academic_year_id)),
        with: { student: { with: { userAccount: true } } }
    });
    const studentIds = enrollments.map(e => e.student_id);
    if (studentIds.length === 0) return { message: "No students enrolled in this class." };

    const assessments = await this.db.query.assessmentTable.findMany({
        where: and(eq(assessmentTable.subject_id, subjectId), eq(assessmentTable.term_id, termId), inArray(assessmentTable.student_id, studentIds))
    });

    const scores = assessments.map(a => parseFloat(a.score || "0")).filter(s => !isNaN(s));
    if (scores.length === 0) return { message: "No scores recorded." };
    
    const average_score = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const student_performance = enrollments.map(enrollment => {
        const studentAssessments = assessments.filter(a => a.student_id === enrollment.student_id);
        const total_score = studentAssessments.reduce((sum, a) => sum + (parseFloat(a.score || "0")), 0);
        return {
            student_id: enrollment.student_id,
            student_name: enrollment.student.userAccount?.full_name || 'N/A',
            total_score,
            assessments: studentAssessments
        }
    }).sort((a, b) => b.total_score - a.total_score);

    return { average_score: parseFloat(average_score.toFixed(2)), highest_score: Math.max(...scores), lowest_score: Math.min(...scores), student_performance };
  }

  async getStudentSubjectHistory(studentId: number, subjectId: number): Promise<any> {
    const history = await this.db.query.assessmentTable.findMany({
        where: and(eq(assessmentTable.student_id, studentId), eq(assessmentTable.subject_id, subjectId)),
        with: { term: { with: { academicYear: true } } },
        orderBy: [asc(assessmentTable.assessment_date)]
    });
    const structuredHistory = history.reduce((acc: { [key: string]: any }, assessment) => {
        const key = `${assessment.term.academicYear.year_name} - ${assessment.term.term_name}`;
        if (!acc[key]) acc[key] = { year: assessment.term.academicYear.year_name, term: assessment.term.term_name, assessments: [] };
        acc[key].assessments.push(assessment);
        return acc;
    }, {});
    return Object.values(structuredHistory);
  }

  async findUnassessedStudents(classId: number, termId: number, assessmentTitle: string): Promise<TStudentSelect[]> {
    const term = await this.termsService.findOne(termId);
    const enrollments = await this.db.query.studentEnrollmentTable.findMany({
        where: and(eq(studentEnrollmentTable.class_id, classId), eq(studentEnrollmentTable.academic_year_id, term.academic_year_id))
    });
    const allStudentIds = enrollments.map(e => e.student_id);

    const assessedStudents = await this.db.query.assessmentTable.findMany({
        where: and(
            eq(assessmentTable.term_id, termId),
            // FIX: Add a guard for null assessment titles
            eq(assessmentTable.assessment_title, assessmentTitle || ''),
            inArray(assessmentTable.student_id, allStudentIds)
        ),
        columns: { student_id: true }
    });
    const assessedStudentIds = new Set(assessedStudents.map(a => a.student_id));
    const unassessedStudentIds = allStudentIds.filter(id => !assessedStudentIds.has(id));

    if (unassessedStudentIds.length === 0) return [];
    return this.db.query.studentTable.findMany({
        where: (s, { inArray }) => inArray(s.student_id, unassessedStudentIds)
    });
  }

  async update(id: number, updateDto: UpdateAssessmentDto): Promise<TAssessmentSelect> {
    await this.findOne(id);
    const dataToUpdate: { [key: string]: any } = { ...updateDto };
    if (updateDto.assessment_date) dataToUpdate.assessment_date = new Date(updateDto.assessment_date);
    const [updatedAssessment] = await this.db.update(assessmentTable).set(dataToUpdate).where(eq(assessmentTable.assessment_id, id)).returning();
    return updatedAssessment;
  }
}