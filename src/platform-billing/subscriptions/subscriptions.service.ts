import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../../drizzle/drizzle.constants';
import { subscriptionTable, TSubscriptionSelect } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PlansService } from '../plans/plans.service';
import { SchoolService } from '../../schools/schools.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly plansService: PlansService,
    private readonly schoolService: SchoolService,
  ) {}

  /**
   * Creates a new subscription for a school.
   */
  async create(createDto: CreateSubscriptionDto): Promise<TSubscriptionSelect> {
    const { school_id, plan_id } = createDto;

    // Validation 1: Ensure school and plan exist and are active.
    const [school, plan] = await Promise.all([
        this.schoolService.findOne(school_id),
        this.plansService.findOne(plan_id),
    ]).catch(err => {
        throw new BadRequestException(`Invalid school or plan ID: ${err.message}`);
    });
    if (!plan.is_active) {
        throw new BadRequestException(`Plan with ID ${plan_id} is not active and cannot be assigned.`);
    }

    // Validation 2: Ensure a school does not have more than one active subscription.
    const existingSubscription = await this.db.query.subscriptionTable.findFirst({
        where: eq(subscriptionTable.school_id, school_id)
    });
    if (existingSubscription) {
        throw new ConflictException(`School with ID ${school_id} already has a subscription.`);
    }

    const dataToInsert = {
        ...createDto,
        current_period_start: new Date(createDto.current_period_start),
        current_period_end: new Date(createDto.current_period_end),
        trial_end_date: createDto.trial_end_date ? new Date(createDto.trial_end_date) : null,
    };
    const [newSubscription] = await this.db.insert(subscriptionTable).values(dataToInsert).returning();
    return newSubscription;
  }

  /**
   * Retrieves a single subscription by its ID.
   */
  async findOne(id: number): Promise<any> {
    const subscription = await this.db.query.subscriptionTable.findFirst({
        where: eq(subscriptionTable.subscription_id, id),
        with: { plan: true, school: true }
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found.`);
    }
    return subscription;
  }
  
  /**
   * Retrieves the subscription for a specific school.
   */
  async findBySchool(schoolId: number): Promise<any> {
    await this.schoolService.findOne(schoolId);
    const subscription = await this.db.query.subscriptionTable.findFirst({
        where: eq(subscriptionTable.school_id, schoolId),
        with: { plan: true }
    });
    if (!subscription) {
      throw new NotFoundException(`No subscription found for school with ID ${schoolId}.`);
    }
    return subscription;
  }

  /**
   * Updates an existing subscription (e.g., changes status, renews period).
   */
  async update(id: number, updateDto: UpdateSubscriptionDto): Promise<TSubscriptionSelect> {
    await this.findOne(id);
    const dataToUpdate: { [key: string]: any } = { ...updateDto };
    if (updateDto.current_period_start) dataToUpdate.current_period_start = new Date(updateDto.current_period_start);
    if (updateDto.current_period_end) dataToUpdate.current_period_end = new Date(updateDto.current_period_end);
    if (updateDto.canceled_at) dataToUpdate.canceled_at = new Date(updateDto.canceled_at);

    const [updatedSubscription] = await this.db.update(subscriptionTable)
        .set(dataToUpdate)
        .where(eq(subscriptionTable.subscription_id, id))
        .returning();
    return updatedSubscription;
  }

  /**
   * Cancels a subscription by setting its status and canceled_at date.
   */
  async cancel(id: number): Promise<TSubscriptionSelect> {
      const subscription = await this.findOne(id);
      if (subscription.status === 'canceled') {
          throw new BadRequestException('This subscription has already been canceled.');
      }
      return this.update(id, { status: 'canceled', canceled_at: new Date().toISOString() });
  }
}