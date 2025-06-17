import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { DrizzleHealthIndicator } from './drizzle.health';

@Module({
  imports: [
    TerminusModule,
    DrizzleModule, // Import DrizzleModule to inject the db connection
  ],
  controllers: [HealthController],
  providers: [DrizzleHealthIndicator], // Provide our custom health indicator
})
export class HealthModule {}