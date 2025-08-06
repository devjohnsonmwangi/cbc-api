import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { SchoolModule } from '../schools/schools.module';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

/**
 * The VenuesModule manages all operations related to physical or virtual
 * locations within a school where activities can take place.
 */
@Module({
  imports: [
    DrizzleModule,
    SchoolModule, // Provides SchoolService for validating the school_id
  ],
  controllers: [VenuesController],
  providers: [VenuesService],
  exports: [VenuesService], // Export so other modules (e.g., LessonsModule, EventsModule) can use it
})
export class VenuesModule {}