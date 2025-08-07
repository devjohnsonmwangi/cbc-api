import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../../drizzle/drizzle.constants';
import { planTable, TPlanSelect } from '../../drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(@Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB) {}

  async create(createDto: CreatePlanDto): Promise<TPlanSelect> {
    const existingPlan = await this.db.query.planTable.findFirst({
        where: eq(planTable.name, createDto.name)
    });
    if (existingPlan) {
        throw new ConflictException(`A plan named "${createDto.name}" already exists.`);
    }
    const [newPlan] = await this.db.insert(planTable).values(createDto).returning();
    return newPlan;
  }

  async findOne(id: number): Promise<TPlanSelect> {
    const plan = await this.db.query.planTable.findFirst({ where: eq(planTable.plan_id, id) });
    if (!plan) throw new NotFoundException(`Plan with ID ${id} not found.`);
    return plan;
  }

  async findAll(onlyActive: boolean = true): Promise<TPlanSelect[]> {
    const whereCondition = onlyActive ? eq(planTable.is_active, true) : undefined;
    return this.db.query.planTable.findMany({ where: whereCondition });
  }

  async update(id: number, updateDto: UpdatePlanDto): Promise<TPlanSelect> {
    await this.findOne(id);
    const [updatedPlan] = await this.db.update(planTable).set(updateDto).where(eq(planTable.plan_id, id)).returning();
    return updatedPlan;
  }

  async delete(id: number): Promise<{ message: string }> {
      // In production, you would deactivate a plan, not delete it, to preserve historical data for subscriptions.
      await this.update(id, { is_active: false });
      return { message: `Plan with ID ${id} has been deactivated.`};
  }
}