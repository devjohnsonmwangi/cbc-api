import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { academicYearTable, schoolTable, termTable, TAcademicYearSelect } from '../drizzle/schema';
import { eq, and, isNull, gte, lte, ne } from 'drizzle-orm';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';

@Injectable()
export class AcademicYearService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
  ) {}

  async create(createDto: CreateAcademicYearDto): Promise<TAcademicYearSelect> {
    const { school_id, start_date, end_date, year_name } = createDto;

    if (new Date(start_date) >= new Date(end_date)) {
      throw new BadRequestException('The academic year start date must be before the end date.');
    }

    const school = await this.db.query.schoolTable.findFirst({
        where: and(eq(schoolTable.school_id, school_id), isNull(schoolTable.archived_at)),
    });
    if (!school) {
        throw new BadRequestException(`A valid, active school with ID ${school_id} was not found.`);
    }

    const overlappingYear = await this.db.query.academicYearTable.findFirst({
      where: and(
        eq(academicYearTable.school_id, school_id),
        isNull(academicYearTable.archived_at),
        lte(academicYearTable.start_date, new Date(end_date)),
        gte(academicYearTable.end_date, new Date(start_date))
      ),
    });
    if (overlappingYear) {
      throw new ConflictException(`The date range overlaps with the existing academic year: "${overlappingYear.year_name}".`);
    }

    const existingName = await this.db.query.academicYearTable.findFirst({
        where: and(
            eq(academicYearTable.school_id, school_id),
            eq(academicYearTable.year_name, year_name),
            isNull(academicYearTable.archived_at)
        )
    });
    if (existingName) {
        throw new ConflictException(`An academic year named "${year_name}" already exists for this school.`);
    }

    // FIX 1: Convert DTO strings to Date objects for insertion.
    const dataToInsert = {
      ...createDto,
      start_date: new Date(createDto.start_date),
      end_date: new Date(createDto.end_date),
    };

    const [newAcademicYear] = await this.db
      .insert(academicYearTable)
      .values(dataToInsert) // Use the converted data object
      .returning();
      
    return newAcademicYear;
  }

  async findAllForSchool(schoolId: number): Promise<TAcademicYearSelect[]> {
    return this.db.query.academicYearTable.findMany({
      where: and(
        eq(academicYearTable.school_id, schoolId),
        isNull(academicYearTable.archived_at),
      ),
      orderBy: (academicYears, { desc }) => [desc(academicYears.start_date)],
      with: {
        terms: {
          where: (terms, { isNull }) => isNull(terms.archived_at),
          orderBy: (terms, { asc }) => [asc(terms.start_date)],
        }, 
      },
    });
  }

  async findOne(id: number): Promise<TAcademicYearSelect> {
    const year = await this.db.query.academicYearTable.findFirst({
      where: eq(academicYearTable.year_id, id),
      with: { terms: true },
    });
    if (!year) {
      throw new NotFoundException(`Academic Year with ID ${id} not found.`);
    }
    return year;
  }

  async update(id: number, updateDto: UpdateAcademicYearDto): Promise<TAcademicYearSelect> {
    const existingYear = await this.findOne(id);

    if (updateDto.year_name) {
      // FIX 2: Corrected the typo from 'academicYearTastable' to 'academicYearTable'.
      const existingName = await this.db.query.academicYearTable.findFirst({
        where: and(
            eq(academicYearTable.school_id, existingYear.school_id),
            eq(academicYearTable.year_name, updateDto.year_name),
            ne(academicYearTable.year_id, id),
            isNull(academicYearTable.archived_at)
        )
      });
      if (existingName) {
        throw new ConflictException(`An academic year named "${updateDto.year_name}" already exists.`);
      }
    }
    
    // Create an object for updating that handles potential date conversions
    const dataToUpdate: { [key: string]: any } = { ...updateDto };
    if (updateDto.start_date) {
        dataToUpdate.start_date = new Date(updateDto.start_date);
    }
    if (updateDto.end_date) {
        dataToUpdate.end_date = new Date(updateDto.end_date);
    }

    const [updatedYear] = await this.db
      .update(academicYearTable)
      // FIX 3: Removed the non-existent 'updated_at' field and passed the correctly typed update object.
      .set(dataToUpdate)
      .where(eq(academicYearTable.year_id, id))
      .returning();
      
    return updatedYear;
  }

  async archive(id: number): Promise<{ message: string }> {
    const existingYear = await this.findOne(id);

    if (existingYear.archived_at) {
        throw new BadRequestException(`Academic Year with ID ${id} is already archived.`);
    }
    
    const activeTerms = await this.db.query.termTable.findFirst({
        where: and(
            eq(termTable.academic_year_id, id),
            isNull(termTable.archived_at)
        )
    });

    if (activeTerms) {
        throw new BadRequestException(`Cannot archive an academic year with active terms. Please archive all terms first.`);
    }

    await this.db
      .update(academicYearTable)
      .set({ archived_at: new Date() })
      .where(eq(academicYearTable.year_id, id));

    return { message: `Academic Year with ID ${id} was successfully archived.` };
  }
}