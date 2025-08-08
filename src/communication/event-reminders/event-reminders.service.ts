// developed    with  NestJS, TypeScript, and Drizzle ORM
// developed  by   senior  developer   Eng Johnson Mwangi
// this   code  is  part  of  a  school management system API
// this   code  is  for  managing event reminders
// any  issues  or   bugs  should    be  reported  to   the   developer  team:  senior developer Eng Johnson Mwangi
// my   email: johnsonthuraniramwangi@gmail.com
// or our   developer  team email: jomulimited2@gmail.com

import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { DRIZZLE_ORM_TOKEN } from '../../drizzle/drizzle.constants'; // Corrected import path
import * as schema from '../../drizzle/schema';
import { CreateEventReminderDto } from './dto/event-reminder.dto';

@Injectable()
export class EventRemindersService {
  private readonly logger = new Logger(EventRemindersService.name);

  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private database: NodePgDatabase<typeof schema>,
    @InjectQueue('communication-jobs') private readonly communicationQueue: Queue,
  ) {}

  async create(eventId: number, createEventReminderDto: CreateEventReminderDto, schoolId: number): Promise<schema.TEventReminderSelect> {
    this.logger.log(`Attempting to create reminder for Event ID: ${eventId} in School ID: ${schoolId}`);

    const parentEvent = await this.database.query.eventTable.findFirst({
      where: and(
        eq(schema.eventTable.event_id, eventId),
        eq(schema.eventTable.school_id, schoolId),
      ),
    });

    if (!parentEvent) {
      throw new NotFoundException(`Event with ID ${eventId} was not found.`);
    }

    const eventStartTime = parentEvent.start_time;
    const remindAt = new Date(eventStartTime.getTime() - createEventReminderDto.minutes_before * 60000);

    if (remindAt.getTime() <= Date.now()) {
      throw new BadRequestException('The calculated reminder time is in the past. Please choose a time in the future.');
    }
    
    const delay = remindAt.getTime() - Date.now();
    
    // CORRECTED: Create an explicitly typed object for insertion to satisfy Drizzle's strict typing.
    const reminderToInsert: schema.TEventReminderInsert = {
        event_id: eventId,
        minutes_before: createEventReminderDto.minutes_before,
        channels: [createEventReminderDto.channels as ["dashboard", "email", "sms"]], // Cast to tuple type as required by Drizzle.
        remind_at: remindAt,
    };

    try {
      const newReminder = await this.database.transaction(async (transaction: NodePgDatabase<typeof schema>) => {
        const [insertedRecord] = await transaction
          .insert(schema.eventReminderTable)
          .values(reminderToInsert) // Use the prepared, correctly typed object.
          .returning();
        
        await this.communicationQueue.add(
          'send-event-reminder',
          { reminderId: insertedRecord.reminder_id }, // Payload for the processor
          {
            delay: delay,
            jobId: `reminder-${insertedRecord.reminder_id}`,
          },
        );

        this.logger.log(`Successfully created and scheduled Reminder ID: ${insertedRecord.reminder_id} to be sent at ${remindAt.toISOString()}`);
        return insertedRecord;
      });

      return newReminder;
    } catch (error: unknown) {
        if (error instanceof Error) {
            this.logger.error(`Failed to create reminder for Event ID ${eventId}. Error: ${error.message}`, error.stack);
        } else {
            this.logger.error(`An unknown error occurred while creating reminder for Event ID ${eventId}.`, error);
        }
      throw new InternalServerErrorException('A critical error occurred while creating the event reminder.');
    }
  }

  async findAllForEvent(eventId: number, schoolId: number): Promise<schema.TEventReminderSelect[]> {
    await this.database.query.eventTable.findFirst({
        where: and(
            eq(schema.eventTable.event_id, eventId),
            eq(schema.eventTable.school_id, schoolId)
        )
    }).then(event => {
        if (!event) throw new NotFoundException(`Event with ID ${eventId} not found.`);
    });
    
    return this.database.query.eventReminderTable.findMany({
      where: eq(schema.eventReminderTable.event_id, eventId),
    });
  }

  async remove(reminderId: number, eventId: number, schoolId: number): Promise<{ message: string }> {
    const reminder = await this.database.query.eventReminderTable.findFirst({
        where: and(
            eq(schema.eventReminderTable.reminder_id, reminderId),
            eq(schema.eventReminderTable.event_id, eventId)
        )
    });

    if (!reminder) {
        throw new NotFoundException(`Reminder with ID ${reminderId} for Event ${eventId} not found.`);
    }

    await this.findAllForEvent(eventId, schoolId);

    const job = await this.communicationQueue.getJob(`reminder-${reminderId}`);
    if (job) {
        await job.remove();
        this.logger.log(`Removed scheduled job for Reminder ID: ${reminderId}`);
    }

    await this.database.delete(schema.eventReminderTable).where(eq(schema.eventReminderTable.reminder_id, reminderId));
    this.logger.log(`Deleted Reminder ID: ${reminderId} from the database.`);

    return { message: `Reminder with ID ${reminderId} has been successfully deleted.` };
  }
}