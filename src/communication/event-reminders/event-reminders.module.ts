import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EventRemindersService } from './event-reminders.service';
import { EventRemindersController } from './event-reminders.controller';
import { DrizzleModule } from '../../drizzle/drizzle.module';
import { MailModule } from '../../mailer/mailer.module'; // <-- IMPORT the mailer module
import { EventRemindersProcessor } from './event-reminders.processor'; // <-- IMPORT the processor

@Module({
  imports: [
    DrizzleModule,
    MailModule, // <-- ADD the mailer module to imports
    BullModule.registerQueue({
      name: 'communication-jobs',
    }),
  ],
  controllers: [EventRemindersController],
  // The service is for the API, the processor is for the background worker.
  providers: [EventRemindersService, EventRemindersProcessor], // <-- ADD the processor to providers
})
export class EventRemindersModule {}