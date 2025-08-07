import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../drizzle/drizzle.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

/**
 * Manages the subscription plans offered by the platform to schools.
 */
@Module({
  imports: [DrizzleModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService], // Export for use by SubscriptionsModule
})
export class PlansModule {}