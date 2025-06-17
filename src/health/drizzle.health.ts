import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { sql } from 'drizzle-orm';

@Injectable()
export class DrizzleHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private readonly db: DrizzleDB,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // A simple, fast query to check if the database is responsive.
      await this.db.execute(sql`SELECT 1`);
      return this.getStatus(key, true);
    } catch (e) {
      throw new HealthCheckError(
        'Drizzle health check failed',
        this.getStatus(key, false, { message: e instanceof Error ? e.message : String(e) }),
      );
    }
  }
}