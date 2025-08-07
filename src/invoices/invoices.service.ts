
import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { invoiceTable, TInvoiceSelect, studentEnrollmentTable, feeStructureTable } from '../drizzle/schema';
import { eq, and, sql, isNull, inArray } from 'drizzle-orm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { StudentsService } from '../students/students.service';
import { TermService } from '../terms/terms.service';
import { StudentEnrollmentsService } from '../student-enrollment/student-enrollment.service';

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly studentsService: StudentsService,
    private readonly termsService: TermService,
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
  ) {}

  /**
   * Creates a single, manual invoice for a student.
   */
  async create(createDto: CreateInvoiceDto): Promise<TInvoiceSelect> {
    const { student_id, term_id } = createDto;

    // Validation 1: Ensure student and term exist.
    await Promise.all([
        this.studentsService.findOne(student_id),
        this.termsService.findOne(term_id),
    ]).catch(err => {
        throw new BadRequestException(`Invalid student or term ID: ${err.message}`);
    });

    // Validation 2: Prevent duplicate invoices for the same student in the same term.
    const existingInvoice = await this.db.query.invoiceTable.findFirst({
        where: and(
            eq(invoiceTable.student_id, student_id),
            eq(invoiceTable.term_id, term_id)
        )
    });
    if (existingInvoice) {
      throw new ConflictException(`An invoice for student ID ${student_id} already exists for this term.`);
    }
    
    const dataToInsert = { ...createDto, due_date: new Date(createDto.due_date) };
    const [newInvoice] = await this.db.insert(invoiceTable).values(dataToInsert).returning();
    return newInvoice;
  }

  /**
   * Retrieves a single invoice by its ID with full details.
   */
  async findOne(id: number): Promise<any> {
    const invoice = await this.db.query.invoiceTable.findFirst({
        where: eq(invoiceTable.invoice_id, id),
        with: { student: { with: { userAccount: true } }, term: { with: { academicYear: true } }, payments: true }
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found.`);
    }
    return invoice;
  }
  
  /**
   * Finds all invoices for a specific student.
   */
  async findAllByStudent(studentId: number): Promise<any[]> {
      await this.studentsService.findOne(studentId);
      return this.db.query.invoiceTable.findMany({
          where: eq(invoiceTable.student_id, studentId),
          with: { term: { with: { academicYear: true } } },
          orderBy: (i, { desc }) => [desc(i.created_at)]
      });
  }

  /**
   * Updates an existing invoice.
   */
  async update(id: number, updateDto: UpdateInvoiceDto): Promise<TInvoiceSelect> {
    await this.findOne(id);
    const dataToUpdate: { [key: string]: any } = { ...updateDto };
    if (updateDto.due_date) dataToUpdate.due_date = new Date(updateDto.due_date);

    const [updatedInvoice] = await this.db.update(invoiceTable).set(dataToUpdate).where(eq(invoiceTable.invoice_id, id)).returning();
    return updatedInvoice;
  }

  // ========================================================================
  // BULK OPERATIONS - PRODUCTION POWERHOUSE
  // ========================================================================

  /**
   * Automatically generates invoices for all actively enrolled students in a given class for a specific term.
   * It fetches the correct fee amount from the fee structure.
   * @param classId - The ID of the class to generate invoices for.
   * @param termId - The ID of the term.
   * @param dueDate - The due date for all generated invoices.
   * @returns A summary of the generation process.
   */
  async generateInvoicesForClass(classId: number, termId: number, dueDate: string): Promise<{ message: string, generated_count: number, skipped_count: number }> {
      const term = await this.termsService.findOne(termId, { with: { academicYear: true } });
      const academicYearId = term.academic_year_id;

      const enrollments = await this.studentEnrollmentsService.findAllByClass(classId, academicYearId);
      const activeStudents = enrollments.filter(e => e.status === 'active');
      if (activeStudents.length === 0) {
          throw new BadRequestException('No active students found in this class for the specified academic year.');
      }
      const gradeLevel = activeStudents[0].class.grade_level;

      // Find the fee structure for this grade level and year
      const feeStructure = await this.db.query.feeStructureTable.findFirst({
          where: and(
              eq(feeStructureTable.academic_year_id, academicYearId),
              eq(feeStructureTable.grade_level, gradeLevel),
              isNull(feeStructureTable.archived_at)
          )
      });
      if (!feeStructure) {
          throw new NotFoundException(`No active fee structure found for ${gradeLevel} in the academic year ${term.academicYear.year_name}.`);
      }
      
      // Assume fees are paid per term, so divide annual fee by 3 (can be made more complex)
      const termAmount = (parseFloat(feeStructure.total_amount) / 3).toFixed(2);
      const formattedDueDate = new Date(dueDate);

      const invoicesToCreate: any[] = [];
      let skipped_count = 0;

      // Check which students in this class already have an invoice for this term
      const studentIds = activeStudents.map(e => e.student_id);
      const existingInvoices = await this.db.query.invoiceTable.findMany({
          where: and(inArray(invoiceTable.student_id, studentIds), eq(invoiceTable.term_id, termId))
      });
      const studentsWithInvoices = new Set(existingInvoices.map(inv => inv.student_id));

      for (const enrollment of activeStudents) {
          if (studentsWithInvoices.has(enrollment.student_id)) {
              skipped_count++;
              continue; // Skip if already invoiced
          }
          invoicesToCreate.push({
              student_id: enrollment.student_id,
              term_id: termId,
              amount_due: termAmount,
              due_date: formattedDueDate,
              notes: `Auto-generated invoice for ${term.term_name}, ${term.academicYear.year_name}.`
          });
      }

      if (invoicesToCreate.length > 0) {
          await this.db.insert(invoiceTable).values(invoicesToCreate);
      }
      
      return {
          message: `Invoice generation complete for class ID ${classId}.`,
          generated_count: invoicesToCreate.length,
          skipped_count: skipped_count,
      };
  }
}