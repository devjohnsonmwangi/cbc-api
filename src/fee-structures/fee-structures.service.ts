import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { feeStructureTable, TFeeStructureSelect } from '../drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';
import { AcademicYearService } from '../academic-years/academic-years.service';

@Injectable()
export class FeeStructuresService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly academicYearsService: AcademicYearService,
  ) {}

  /**
   * Creates a new fee structure for a specific grade level in an academic year.
   */
  async create(createDto: CreateFeeStructureDto): Promise<TFeeStructureSelect> {
    const { academic_year_id, grade_level } = createDto;

    // Validation 1: Ensure the parent academic year exists and is active.
    const academicYear = await this.academicYearsService.findOne(academic_year_id);
    if (academicYear.archived_at) {
        throw new BadRequestException('Cannot create a fee structure for an archived academic year.');
    }

    // Validation 2: Prevent duplicate fee structures for the same grade level in the same year.
    const existingStructure = await this.db.query.feeStructureTable.findFirst({
        where: and(
            eq(feeStructureTable.academic_year_id, academic_year_id),
            eq(feeStructureTable.grade_level, grade_level),
            isNull(feeStructureTable.archived_at)
        )
    });
    if (existingStructure) {
      throw new ConflictException(`A fee structure for ${grade_level} already exists in this academic year.`);
    }

    const [newStructure] = await this.db.insert(feeStructureTable).values(createDto).returning();
    return newStructure;
  }

  /**
   * Retrieves a single fee structure by its ID.
   */
  async findOne(id: number): Promise<TFeeStructureSelect> {
    const structure = await this.db.query.feeStructureTable.findFirst({
        where: eq(feeStructureTable.fee_structure_id, id),
    });
    if (!structure) {
      throw new NotFoundException(`Fee structure with ID ${id} not found.`);
    }
    return structure;
  }

  /**
   * Finds all active fee structures for a given academic year.
   */
  async findAllByAcademicYear(academicYearId: number): Promise<TFeeStructureSelect[]> {
    await this.academicYearsService.findOne(academicYearId); // Validate year exists
    return this.db.query.feeStructureTable.findMany({
        where: and(
            eq(feeStructureTable.academic_year_id, academicYearId),
            isNull(feeStructureTable.archived_at)
        ),
        orderBy: (fs, { asc }) => [asc(fs.grade_level)]
    });
  }

  /**
   * Updates an existing fee structure.
   */
  async update(id: number, updateDto: UpdateFeeStructureDto): Promise<TFeeStructureSelect> {
    await this.findOne(id); // Ensure it exists
    const [updatedStructure] = await this.db.update(feeStructureTable)
        .set(updateDto)
        .where(eq(feeStructureTable.fee_structure_id, id))
        .returning();
    return updatedStructure;
  }

  /**
   * Archives a fee structure.
   */
  async archive(id: number): Promise<{ message: string }> {
    const structure = await this.findOne(id);
    if (structure.archived_at) {
        throw new BadRequestException(`Fee structure with ID ${id} is already archived.`);
    }
    // Production Check: Before archiving, verify it's not in use by any active invoices.
    await this.db.update(feeStructureTable).set({ archived_at: new Date() }).where(eq(feeStructureTable.fee_structure_id, id));
    return { message: `Fee structure with ID ${id} has been successfully archived.` };
  }
}