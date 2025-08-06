import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { subjectTable, TSubjectSelect } from '../drizzle/schema';
import { eq, and, isNull, ne, or } from 'drizzle-orm';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SchoolService } from '../schools/schools.service';

@Injectable()
export class SubjectsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly schoolService: SchoolService,
  ) {}

  async create(createDto: CreateSubjectDto): Promise<TSubjectSelect> {
    const { school_id, subject_name, subject_code } = createDto;

    // Validation 1: Ensure parent school exists and is active.
    await this.schoolService.findOne(school_id);

    // Validation 2: Prevent duplicate subject names or codes within the same school.
    const conflictChecks = [];
    conflictChecks.push(eq(subjectTable.subject_name, subject_name));
    if (subject_code) {
        conflictChecks.push(eq(subjectTable.subject_code, subject_code));
    }

    const existingSubject = await this.db.query.subjectTable.findFirst({
        where: and(
            eq(subjectTable.school_id, school_id),
            isNull(subjectTable.archived_at),
            or(...conflictChecks)
        ),
    });

    if (existingSubject) {
        if (existingSubject.subject_name === subject_name) {
            throw new ConflictException(`A subject named "${subject_name}" already exists in this school.`);
        }
        if (subject_code && existingSubject.subject_code === subject_code) {
            throw new ConflictException(`A subject with code "${subject_code}" already exists in this school.`);
        }
    }

    const [newSubject] = await this.db.insert(subjectTable).values(createDto).returning();
    return newSubject;
  }

  async findOne(id: number): Promise<TSubjectSelect> {
    const subject = await this.db.query.subjectTable.findFirst({
      where: eq(subjectTable.subject_id, id),
    });
    if (!subject) {
      throw new NotFoundException(`Subject with ID ${id} not found.`);
    }
    return subject;
  }

  async findAllForSchool(schoolId: number): Promise<TSubjectSelect[]> {
    await this.schoolService.findOne(schoolId);
    return this.db.query.subjectTable.findMany({
        where: and(
            eq(subjectTable.school_id, schoolId),
            isNull(subjectTable.archived_at)
        ),
        orderBy: (subjects, { asc }) => [asc(subjects.subject_name)],
    });
  }

  async update(id: number, updateDto: UpdateSubjectDto): Promise<TSubjectSelect> {
    await this.findOne(id);
    const [updatedSubject] = await this.db
        .update(subjectTable)
        .set(updateDto)
        .where(eq(subjectTable.subject_id, id))
        .returning();
    return updatedSubject;
  }

  async archive(id: number): Promise<{ message: string }> {
    const subject = await this.findOne(id);
    if (subject.archived_at) {
        throw new ConflictException(`Subject with ID ${id} is already archived.`);
    }

    // Production check: In a real system, you'd check for dependencies
    // like teacher assignments or assessments before archiving.
    
    await this.db.update(subjectTable).set({ archived_at: new Date() }).where(eq(subjectTable.subject_id, id));
    return { message: `Subject with ID ${id} has been successfully archived.` };
  }
}