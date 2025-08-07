import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../../drizzle/drizzle.constants';
import { platformInvoiceTable, TPlatformInvoiceSelect } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { CreatePlatformInvoiceDto } from './dto/create-platform-invoice.dto';
import { UpdatePlatformInvoiceDto } from './dto/update-platform-invoice.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class PlatformInvoicesService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Creates a new invoice for a school's subscription.
   */
  async create(createDto: CreatePlatformInvoiceDto): Promise<TPlatformInvoiceSelect> {
    const { subscription_id, period_start, period_end } = createDto;

    // Validation 1: Ensure the parent subscription exists.
    await this.subscriptionsService.findOne(subscription_id);

    // Validation 2: Prevent creating a duplicate invoice for the same subscription and billing period.
    const existingInvoice = await this.db.query.platformInvoiceTable.findFirst({
        where: and(
            eq(platformInvoiceTable.subscription_id, subscription_id),
            eq(platformInvoiceTable.period_start, new Date(period_start)),
            eq(platformInvoiceTable.period_end, new Date(period_end))
        )
    });
    if (existingInvoice) {
        throw new ConflictException(`An invoice for this subscription and billing period already exists.`);
    }

    const dataToInsert = {
        ...createDto,
        due_date: new Date(createDto.due_date),
        period_start: new Date(createDto.period_start),
        period_end: new Date(createDto.period_end),
    };

    const [newInvoice] = await this.db.insert(platformInvoiceTable).values(dataToInsert).returning();
    return newInvoice;
  }

  /**
   * Retrieves a single platform invoice by its ID.
   */
  async findOne(id: number): Promise<any> {
    const invoice = await this.db.query.platformInvoiceTable.findFirst({
        where: eq(platformInvoiceTable.invoice_id, id),
        with: { subscription: { with: { school: true, plan: true } }, payments: true }
    });
    if (!invoice) {
      throw new NotFoundException(`Platform invoice with ID ${id} not found.`);
    }
    return invoice;
  }

  /**
   * Finds all invoices for a given subscription.
   */
  async findAllBySubscription(subscriptionId: number): Promise<TPlatformInvoiceSelect[]> {
      await this.subscriptionsService.findOne(subscriptionId);
      return this.db.query.platformInvoiceTable.findMany({
          where: eq(platformInvoiceTable.subscription_id, subscriptionId),
          orderBy: (pi, { desc }) => [desc(pi.created_at)]
      });
  }

  /**
   * Updates the status of a platform invoice.
   */
  async update(id: number, updateDto: UpdatePlatformInvoiceDto): Promise<TPlatformInvoiceSelect> {
    await this.findOne(id);
    const [updatedInvoice] = await this.db.update(platformInvoiceTable)
        .set(updateDto)
        .where(eq(platformInvoiceTable.invoice_id, id))
        .returning();
    return updatedInvoice;
  }
}