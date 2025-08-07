import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { invoiceTable, TInvoiceSelect, studentEnrollmentTable, feeStructureTable, paymentTable, parentStudentLinkTable, studentTable } from '../drizzle/schema';
import { eq, and, sql, isNull, inArray, lt, sum, count, ne, gte, lte, asc } from 'drizzle-orm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { StudentsService } from '../students/students.service';
import { TermService } from '../terms/terms.service';
import { StudentEnrollmentsService } from '../student-enrollment/student-enrollment.service';
import { UserService } from '../users/users.service';

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly studentsService: StudentsService,
    private readonly termsService: TermService,
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
    private readonly userService: UserService,
  ) {}

  // ========================================================================
  // CORE CRUD OPERATIONS
  // ========================================================================

  async create(createDto: CreateInvoiceDto): Promise<TInvoiceSelect> {
    const { student_id, term_id } = createDto;

    await Promise.all([
        this.studentsService.findOne(student_id),
        this.termsService.findOne(term_id),
    ]).catch(err => {
        throw new BadRequestException(`Invalid student or term ID: ${err.message}`);
    });

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
  
  async findAllByStudent(studentId: number): Promise<any[]> {
      await this.studentsService.findOne(studentId);
      return this.db.query.invoiceTable.findMany({
          where: eq(invoiceTable.student_id, studentId),
          with: { term: { with: { academicYear: true } } },
          orderBy: (i, { desc }) => [desc(i.created_at)]
      });
  }

  async update(id: number, updateDto: UpdateInvoiceDto): Promise<TInvoiceSelect> {
    await this.findOne(id);
    const dataToUpdate: { [key: string]: any } = { ...updateDto };
    if (updateDto.due_date) dataToUpdate.due_date = new Date(updateDto.due_date);

    const [updatedInvoice] = await this.db.update(invoiceTable).set(dataToUpdate).where(eq(invoiceTable.invoice_id, id)).returning();
    return updatedInvoice;
  }

  // ========================================================================
  // BULK GENERATION OPERATIONS
  // ========================================================================

  async generateInvoicesForClass(classId: number, termId: number, dueDate: string): Promise<{ message: string, generated_count: number, skipped_count: number }> {
      const term = await this.termsService.findOne(termId, { with: { academicYear: true } });
      const academicYearId = term.academic_year_id;

      const enrollments = await this.studentEnrollmentsService.findAllByClass(classId, academicYearId);
      const activeStudents = enrollments.filter(e => e.status === 'active');
      if (activeStudents.length === 0) {
          throw new BadRequestException('No active students found in this class for the specified academic year.');
      }
      const gradeLevel = activeStudents[0].class.grade_level;

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
      
      const termAmount = (parseFloat(feeStructure.total_amount) / 3).toFixed(2);
      const formattedDueDate = new Date(dueDate);

      const invoicesToCreate: any[] = [];
      let skipped_count = 0;

      const studentIds = activeStudents.map(e => e.student_id);
      const existingInvoices = await this.db.query.invoiceTable.findMany({
          where: and(inArray(invoiceTable.student_id, studentIds), eq(invoiceTable.term_id, termId))
      });
      const studentsWithInvoices = new Set(existingInvoices.map(inv => inv.student_id));

      for (const enrollment of activeStudents) {
          if (studentsWithInvoices.has(enrollment.student_id)) {
              skipped_count++;
              continue;
          }
          invoicesToCreate.push({
              student_id: enrollment.student_id,
              term_id: termId,
              amount_due: termAmount,
              due_date: formattedDueDate,
              notes: `Auto-generated for ${term.term_name}, ${term.academicYear.year_name}.`
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

  // ========================================================================
  // ADVANCED ANALYTICAL & OPERATIONAL QUERIES
  // ========================================================================

  /**
   * Generates a high-level financial summary for a given term.
   */
  async getFinancialOverview(termId: number): Promise<any> {
    const result = await this.db.select({
        totalInvoiced: sum(invoiceTable.amount_due).mapWith(Number),
        totalPaid: sum(invoiceTable.amount_paid).mapWith(Number),
        invoiceCount: count(invoiceTable.invoice_id)
    }).from(invoiceTable).where(eq(invoiceTable.term_id, termId));

    const { totalInvoiced, totalPaid, invoiceCount } = result[0];
    const totalOutstanding = totalInvoiced - totalPaid;

    return {
        term_id: termId,
        total_invoiced: totalInvoiced || 0,
        total_paid: totalPaid || 0,
        total_outstanding: totalOutstanding || 0,
        total_invoices: invoiceCount || 0
    };
  }

  /**
   * Finds all invoices that are past their due date and not fully paid.
   */
  async findOverdueInvoices(schoolId: number): Promise<any[]> {
      const today = new Date();
      return this.db.query.invoiceTable.findMany({
          where: and(
              lt(invoiceTable.due_date, today),
              ne(invoiceTable.status, 'paid'),
              inArray(invoiceTable.student_id, 
                (await this.db.query.studentTable.findMany({
                  where: eq(sql`school_id`, schoolId),
                  columns: { student_id: true }
                })).map(s => s.student_id)
              )
          ),
          with: {
              student: { with: { userAccount: true, parentLinks: { with: { parent: true } } } },
              term: true
          },
          orderBy: (i, { asc }) => [asc(i.due_date)]
      });
  }
  
  /**
   * Generates a complete financial statement for a parent, covering all their children.
   */
  async getParentFinancialStatement(parentUserId: number): Promise<any> {
      const parent = await this.userService.findOne(parentUserId);
      const parentLinks = await this.db.query.parentStudentLinkTable.findMany({
          where: eq(parentStudentLinkTable.parent_user_id, parentUserId),
          with: { student: { with: { userAccount: true } } }
      });
      if (parentLinks.length === 0) {
          return { parent, children_statements: [] };
      }
      
      const studentIds = parentLinks.map(link => link.student.student_id);
      
      const allInvoices = await this.db.query.invoiceTable.findMany({
          where: inArray(invoiceTable.student_id, studentIds),
          with: { payments: true, term: true },
          orderBy: (i, { desc }) => [desc(i.created_at)]
      });

      const statements = parentLinks.map(link => {
          const childInvoices = allInvoices.filter(inv => inv.student_id === link.student.student_id);
          return {
              student_id: link.student.student_id,
              student_name: link.student.userAccount?.full_name || `Student #${link.student.admission_number}`,
              invoices: childInvoices
          };
      });

      return { parent, children_statements: statements };
  }

  /**
   * Provides a summary of payments for reconciliation, filterable by date and gateway.
   */
  async getPaymentReconciliationReport(schoolId: number, startDate: string, endDate: string, gateway?: typeof paymentTable.payment_gateway.enumValues[number]): Promise<any> {
      const conditions = [
          gte(paymentTable.payment_date, new Date(startDate)),
          lte(paymentTable.payment_date, new Date(endDate)),
      ];
      if (gateway) {
          conditions.push(eq(paymentTable.payment_gateway, gateway));
      }

      // Join paymentTable with invoiceTable and studentTable to filter by school_id
      const payments = await this.db.select({
          payment_id: paymentTable.payment_id,
          payment_amount: paymentTable.payment_amount,
          payment_date: paymentTable.payment_date,
          payment_gateway: paymentTable.payment_gateway,
          invoice_id: paymentTable.invoice_id,
          student_id: studentTable.student_id,
          student_name: studentTable.admission_number,
          invoice_amount_due: invoiceTable.amount_due,
      })
          .from(paymentTable)
          .innerJoin(invoiceTable, eq(paymentTable.invoice_id, invoiceTable.invoice_id))
          .innerJoin(studentTable, eq(invoiceTable.student_id, studentTable.student_id))
          .where(and(
              eq(studentTable.school_id, schoolId),
              ...conditions
          ))
          .orderBy(asc(paymentTable.payment_date));

      type Gateway = typeof paymentTable.payment_gateway.enumValues[number];
      type Summary = Record<Gateway, { total_amount: number; count: number }>;

      const summary = payments.reduce((acc: Summary, p) => {
          const key = p.payment_gateway as Gateway;
          if (!acc[key]) {
              acc[key] = { total_amount: 0, count: 0 };
          }
          acc[key].total_amount += parseFloat(p.payment_amount);
          acc[key].count++;
          return acc;
      }, {} as Summary);

      return { summary, payments };
  }
}