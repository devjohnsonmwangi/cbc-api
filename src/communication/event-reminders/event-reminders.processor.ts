// developed    with  NestJS, TypeScript, BullMQ, and Drizzle ORM
// developed  by   senior  developer   Eng Johnson Mwangi
// this   processor handles background jobs for the communication module.

import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM_TOKEN } from '../../drizzle/drizzle.constants';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../drizzle/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { MailService } from '../../mailer/mailer.service'; // CORRECTED: Import your actual MailService

interface EventReminderJobPayload {
  reminderId: number;
  // We only need the reminderId, as it's the key to all other information.
}

@Processor('communication-jobs') // Listens to the 'communication-jobs' queue.
export class EventRemindersProcessor {
  private readonly logger = new Logger(EventRemindersProcessor.name);

  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private database: NodePgDatabase<typeof schema>,
    // CORRECTED: Inject your consolidated MailService
    private readonly mailService: MailService,
  ) {}

  /**
   * This method is automatically executed when a job named 'send-event-reminder' is processed.
   * It fetches event and audience details, sends emails using the MailService,
   * and then automatically deletes the reminder record.
   *
   * @param job The BullMQ job object containing the payload.
   */
  @Process('send-event-reminder')
  async handleSendEventReminder(job: Job<EventReminderJobPayload>): Promise<void> {
    const { reminderId } = job.data;
    this.logger.log(`Processing Job ID: ${job.id} for Reminder ID: ${reminderId}`);

    try {
      // Step 1: Fetch the reminder and its parent event in one efficient query.
      const reminder = await this.database.query.eventReminderTable.findFirst({
        where: eq(schema.eventReminderTable.reminder_id, reminderId),
        with: {
          event: true, // Eagerly load the related event details.
        },
      });

      // Step 2: Defensively check if the reminder or event still exists. It could have been deleted manually.
      if (!reminder || !reminder.event) {
        this.logger.warn(`Job ID: ${job.id} - Reminder ID: ${reminderId} or its parent event no longer exists. Skipping processing.`);
        // No error is thrown; the job is considered successfully handled as there's nothing to do.
        return;
      }
      
      const { event } = reminder;

      // Step 3: Resolve the audience. Fetch all non-archived users associated with the event's school.
      const recipients = await this.database.query.userTable.findMany({
        where: and(
            eq(schema.userTable.school_id, event.school_id),
            isNull(schema.userTable.archived_at)
        ),
      });

      if (recipients.length === 0) {
        this.logger.log(`No recipients found for Event ID: ${event.event_id}. Proceeding to cleanup.`);
      } else {
        // Step 4: Call the dedicated, fancy email method in your MailService for each recipient.
        // This delegates all the complex HTML generation logic to the MailService.
        const emailPromises = recipients.map(recipient => 
          this.mailService.sendEventReminderEmail(recipient, event)
        );

        // Use Promise.allSettled to ensure all emails are attempted, even if some fail.
        await Promise.allSettled(emailPromises);
        this.logger.log(`Attempted to send ${recipients.length} email reminders for Event ID: ${event.event_id}.`);
      }

      // Step 5: AUTOMATE CLEANUP. The reminder has served its purpose and is now deleted from the database.
      await this.database.delete(schema.eventReminderTable).where(eq(schema.eventReminderTable.reminder_id, reminderId));
      this.logger.log(`Successfully processed and deleted Reminder ID: ${reminderId}.`);

    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Job ID: ${job.id} - Failed to process reminder ID: ${reminderId}. Error: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Job ID: ${job.id} - An unknown error occurred while processing reminder ID: ${reminderId}.`, error);
      }
      // Throwing an error will cause BullMQ to retry the job based on your queue's default settings.
      throw new Error(`Failed to process job for reminder ${reminderId}`);
    }
  }
}