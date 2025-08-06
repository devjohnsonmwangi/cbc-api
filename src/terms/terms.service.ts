import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { termTable, TTermSelect } from '../drizzle/schema';
import { eq, and, isNull, gte, lte, ne } from 'drizzle-orm';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { AcademicYearService } from '../academic-years/academic-years.service';

@Injectable()
export class TermService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly academicYearService: AcademicYearService, // Inject parent service
  ) {}

  /**
   * Creates a new term within a specific academic year.
   */
  async create(createDto: CreateTermDto): Promise<TTermSelect> {
    const { academic_year_id, start_date, end_date, term_name } = createDto;

    // Validation 1: Ensure parent academic year exists and is active.
    const parentYear = await this.academicYearService.findOne(academic_year_id);
    if (parentYear.archived_at) {
        throw new BadRequestException(`Cannot add a term to an archived academic year.`);
    }

    // Validation 2: Ensure term dates are within the parent academic year's bounds.
    if (new Date(start_date) < parentYear.start_date || new Date(end_date) > parentYear.end_date) {
        throw new BadRequestException(`Term dates must be within the academic year's range (${parentYear.start_date.toISOString().split('T')[0]} to ${parentYear.end_date.toISOString().split('T')[0]}).`);
    }

    // Validation 3: Prevent overlapping term dates within the same academic year.
    const overlappingTerm = await this.db.query.termTable.findFirst({
        where: and(
            eq(termTable.academic_year_id, academic_year_id),
            isNull(termTable.archived_at),
            lte(termTable.start_date, new Date(end_date)),
            gte(termTable.end_date, new Date(start_date))
        ),
    });
    if (overlappingTerm) {
        throw new ConflictException(`Term date range overlaps with existing term: "${overlappingTerm.term_name}".`);
    }

    // Validation 4: Prevent duplicate term names within the same academic year.
    const existingName = await this.db.query.termTable.findFirst({
        where: and(
            eq(termTable.academic_year_id, academic_year_id),
            eq(termTable.term_name, term_name),
            isNull(termTable.archived_at)
        ),
    });
    if (existingName) {
        throw new ConflictException(`A term named "${term_name}" already exists in this academic year.`);
    }

    const dataToInsert = { ...createDto, start_date: new Date(start_date), end_date: new Date(end_date) };
    const [newTerm] = await this.db.insert(termTable).values(dataToInsert).returning();
    return newTerm;
  }

  /**
   * Finds a single term by its ID.
   */
  async findOne(id: number): Promise<TTermSelect> {
    const term = await this.db.query.termTable.findFirst({
      where: eq(termTable.term_id, id),
    });
    if (!term) {
      throw new NotFoundException(`Term with ID ${id} not found.`);
    }
    return term;
  }

  /**
   * Finds all active terms for a given academic year.
   */
  async findAllForAcademicYear(academicYearId: number): Promise<TTermSelect[]> {
    // Ensure the parent year exists first
    await this.academicYearService.findOne(academicYearId);
    
    return this.db.query.termTable.findMany({
        where: and(
            eq(termTable.academic_year_id, academicYearId),
            isNull(termTable.archived_at)
        ),
        orderBy: (terms, { asc }) => [asc(terms.start_date)],
    });
  }

  /**
   * Updates an existing term.
   */
  async update(id: number, updateDto: UpdateTermDto): Promise<TTermSelect> {
    const existingTerm = await this.findOne(id);
    
    // Create an object for updating that handles potential date conversions
    const dataToUpdate: { [key: string]: any } = { ...updateDto };
    if (updateDto.start_date) dataToUpdate.start_date = new Date(updateDto.start_date);
    if (updateDto.end_date) dataToUpdate.end_date = new Date(updateDto.end_date);

    const [updatedTerm] = await this.db
      .update(termTable)
      .set(dataToUpdate)
      .where(eq(termTable.term_id, id))
      .returning();
      
    return updatedTerm;
  }

  /**
   * Archives a term (soft delete).
   */
  async archive(id: number): Promise<{ message: string }> {
    const term = await this.findOne(id);
    if (term.archived_at) {
      throw new BadRequestException(`Term with ID ${id} is already archived.`);
    }

    // Production check: In a real system, you would check for child dependencies here.
    // e.g., if (hasActiveAssessments(id) || hasActiveLessons(id)) throw new BadRequestException(...)

    await this.db
      .update(termTable)
      .set({ archived_at: new Date() })
      .where(eq(termTable.term_id, id));

    return { message: `Term with ID ${id} was successfully archived.` };
  }
}