import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { subjectRequirementTable, TSubjectRequirementSelect } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { CreateSubjectRequirementDto } from './dto/create-subject-requirement.dto';
import { UpdateSubjectRequirementDto } from './dto/update-subject-requirement.dto';
import { TermService } from '../terms/terms.service';
import { ClassesService } from '../classes/classes.service';
import { SubjectsService } from '../subjects/subjects.service';

@Injectable()
export class SubjectRequirementsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly termsService: TermService,
    private readonly classesService: ClassesService,
    private readonly subjectsService: SubjectsService,
  ) {}

  async create(createDto: CreateSubjectRequirementDto): Promise<TSubjectRequirementSelect> {
    const { term_id, class_id, subject_id } = createDto;

    // Validation 1: Check if the requirement already exists
    const existingRequirement = await this.db.query.subjectRequirementTable.findFirst({
        where: and(
            eq(subjectRequirementTable.term_id, term_id),
            eq(subjectRequirementTable.class_id, class_id),
            eq(subjectRequirementTable.subject_id, subject_id)
        )
    });
    if (existingRequirement) {
        throw new ConflictException('A requirement for this subject and class already exists in this term.');
    }

    // Validation 2: Ensure all referenced entities exist and are from the same school
    const [term, classInfo, subject] = await Promise.all([
        this.termsService.findOne(term_id, { with: { academicYear: true } }),
        this.classesService.findOne(class_id),
        this.subjectsService.findOne(subject_id),
    ]).catch(err => {
        throw new BadRequestException(`Invalid reference ID provided: ${err.message}`);
    });

    const schoolId = term.academicYear.school_id;
    if (classInfo.school_id !== schoolId || subject.school_id !== schoolId) {
        throw new BadRequestException('The term, class, and subject must all belong to the same school.');
    }

    const [newRequirement] = await this.db.insert(subjectRequirementTable).values(createDto).returning();
    return newRequirement;
  }

  async findOne(id: number): Promise<any> {
    const requirement = await this.db.query.subjectRequirementTable.findFirst({
        where: eq(subjectRequirementTable.requirement_id, id),
        with: { term: true, class: true, subject: true }
    });
    if (!requirement) {
        throw new NotFoundException(`Subject requirement with ID ${id} not found.`);
    }
    return requirement;
  }

  async findAllForTerm(termId: number): Promise<any[]> {
    await this.termsService.findOne(termId);
    return this.db.query.subjectRequirementTable.findMany({
        where: eq(subjectRequirementTable.term_id, termId),
        with: { class: true, subject: true },
        orderBy: (reqs, { asc }) => [asc(reqs.class_id), asc(reqs.subject_id)]
    });
  }

  async update(id: number, updateDto: UpdateSubjectRequirementDto): Promise<TSubjectRequirementSelect> {
    await this.findOne(id); // Ensure it exists
    const [updatedRequirement] = await this.db
        .update(subjectRequirementTable)
        .set(updateDto)
        .where(eq(subjectRequirementTable.requirement_id, id))
        .returning();
    return updatedRequirement;
  }

  async delete(id: number): Promise<{ message: string }> {
      await this.findOne(id);
      await this.db.delete(subjectRequirementTable).where(eq(subjectRequirementTable.requirement_id, id));
      return { message: `Subject requirement with ID ${id} has been successfully deleted.` };
  }
}