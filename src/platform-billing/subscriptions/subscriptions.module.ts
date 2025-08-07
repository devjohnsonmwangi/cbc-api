import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../drizzle/drizzle.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlansModule } from '../plans/plans.module';
import { SchoolModule } from '../../schools/schools.module';

/**
 * Manages school subscriptions to the platform's plans.
 */
@Module({
  imports: [
    DrizzleModule,
    PlansModule,   // Provides PlansService
    SchoolModule, // Provides SchoolService
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService], // Export for use by PlatformInvoicesModule
})
export class SubscriptionsModule {}