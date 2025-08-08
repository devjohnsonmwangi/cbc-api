// developed    with  NestJS, TypeScript, and Drizzle ORM
// developed  by   senior  developer   Eng Johnson Mwangi
// this   code  is  part  of  a  school management system API
// this   code  is  for  managing official school-wide announcements
// any  issues  or   bugs  should    be  reported  to   the   developer  team:  senior developer Eng Johnson Mwangi
// my   email: johnsonthuraniramwangi@gmail.com
// or our   developer  team email: jomulimited2@gmail.com

import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { and, eq, desc, count, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { DRIZZLE_ORM_TOKEN } from '../../drizzle/drizzle.constants';
import * as schema from '../../drizzle/schema';
import { CreateAnnouncementDto, UpdateAnnouncementDto, GetReceiptsQueryDto } from './dto/announcement.dto';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private database: NodePgDatabase<typeof schema>,
    @InjectQueue('communication-jobs') private readonly communicationQueue: Queue,
  ) {}

  async create(createAnnouncementDto: CreateAnnouncementDto, authorUserId: number, schoolId: number): Promise<schema.TAnnouncementSelect> {
    this.logger.log(`Initiating creation of announcement titled "${createAnnouncementDto.title}" for School ID: ${schoolId}`);

    // CORRECTED: Separate the DTO properties to ensure type compatibility before insertion.
    const { title, body, audience_type, audience_specifier, channels, scheduled_for } = createAnnouncementDto;

    // This object explicitly matches the structure Drizzle expects for an insert operation.
    const announcementToInsert: schema.TAnnouncementInsert = {
      title,
      body,
      audience_type,
      audience_specifier,
      channels: channels.map((c) => [c, "dashboard", "email", "sms"].filter((v, i, arr) => arr.indexOf(v) === i && typeof c === "string") as ["dashboard", "email", "sms"]), // Ensure each channel is a tuple as required.
      author_user_id: authorUserId,
      school_id: schoolId,
      scheduled_for: scheduled_for ? new Date(scheduled_for) : new Date(),
    };

    try {
      const newAnnouncement = await this.database.transaction(async (transaction: NodePgDatabase<typeof schema>) => {
        const [insertedRecord] = await transaction
          .insert(schema.announcementTable)
          .values(announcementToInsert) // Use the prepared object
          .returning();

        await this.communicationQueue.add('process-announcement-receipts', {
          announcementId: insertedRecord.announcement_id,
          schoolId: schoolId,
        });

        this.logger.log(`Successfully created Announcement ID: ${insertedRecord.announcement_id} and queued receipt processing job.`);
        return insertedRecord;
      });

      return newAnnouncement;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create announcement for School ID: ${schoolId}. Error: ${error.message}`, error.stack);
      } else {
        this.logger.error(`An unknown error occurred while creating announcement for School ID: ${schoolId}`, error);
      }
      throw new InternalServerErrorException('A critical error occurred while creating the announcement. The operation was rolled back.');
    }
  }

  async findAllForSchool(schoolId: number): Promise<schema.TAnnouncementSelect[]> {
    return this.database.query.announcementTable.findMany({
      where: and(
        eq(schema.announcementTable.school_id, schoolId),
        isNull(schema.announcementTable.archived_at),
      ),
      orderBy: [desc(schema.announcementTable.scheduled_for)],
      with: {
        author: { columns: { full_name: true } },
      },
      limit: 50,
    });
  }

  async findOneById(announcementId: number, schoolId: number): Promise<schema.TAnnouncementSelect> {
    const announcement = await this.database.query.announcementTable.findFirst({
      where: and(
        eq(schema.announcementTable.announcement_id, announcementId),
        eq(schema.announcementTable.school_id, schoolId),
        isNull(schema.announcementTable.archived_at),
      ),
      with: {
        author: { columns: { full_name: true, email: true } },
      },
    });

    if (!announcement) {
      this.logger.warn(`Security or Not-Found event: Failed lookup for Announcement ID: ${announcementId} in School ID: ${schoolId}`);
      throw new NotFoundException(`The requested announcement with ID ${announcementId} was not found or you do not have permission to view it.`);
    }
    return announcement;
  }

  async update(announcementId: number, updateAnnouncementDto: UpdateAnnouncementDto, schoolId: number): Promise<schema.TAnnouncementSelect> {
    await this.findOneById(announcementId, schoolId);

    this.logger.log(`Updating Announcement ID: ${announcementId} for School ID: ${schoolId}`);

    // CORRECTED: Explicitly handle the DTO for the update operation.
    // Drizzle's `set` method is more flexible, but we still ensure type safety.
    // Prepare the update object, omitting channels for now
    const { channels, scheduled_for, ...restDto } = updateAnnouncementDto;
    const dataToUpdate: Partial<schema.TAnnouncementInsert> = {
      ...restDto,
      updated_at: new Date(), // Explicitly set the updated timestamp.
    };

    // If a new scheduled_for date is provided, convert it to a Date object.
    if (scheduled_for !== undefined && scheduled_for !== null) {
      dataToUpdate.scheduled_for = typeof scheduled_for === 'string' ? new Date(scheduled_for) : scheduled_for;
    }

    // Transform channels to match the expected type if present
    if (channels) {
      // Only allow tuples of ["dashboard", "email", "sms"]
      dataToUpdate.channels = channels
        .map((c) => {
          if (
            Array.isArray(c) &&
            c.length === 3 &&
            c[0] === "dashboard" &&
            c[1] === "email" &&
            c[2] === "sms"
          ) {
            return c as unknown as ["dashboard", "email", "sms"];
          }
          return undefined;
        })
        .filter((v): v is ["dashboard", "email", "sms"] => !!v);
    }

    const [updatedAnnouncement] = await this.database
      .update(schema.announcementTable)
      .set(dataToUpdate) // Use the prepared object
      .where(eq(schema.announcementTable.announcement_id, announcementId))
      .returning();

    return updatedAnnouncement;
  }

  async archive(announcementId: number, schoolId: number): Promise<{ message: string }> {
    await this.findOneById(announcementId, schoolId);

    this.logger.log(`Archiving Announcement ID: ${announcementId} for School ID: ${schoolId}`);

    await this.database
      .update(schema.announcementTable)
      .set({ archived_at: new Date() })
      .where(eq(schema.announcementTable.announcement_id, announcementId));

    return { message: `Announcement with ID ${announcementId} has been successfully archived.` };
  }

  async getAnnouncementReceipts(announcementId: number, schoolId: number, queryDto: GetReceiptsQueryDto) {
    await this.findOneById(announcementId, schoolId);

    const { page, limit } = queryDto;
    const offset = (page - 1) * limit;

    const [receipts, totalResult] = await Promise.all([
      this.database.query.announcementReceiptTable.findMany({
        where: eq(schema.announcementReceiptTable.announcement_id, announcementId),
        with: {
          recipient: { columns: { user_id: true, full_name: true, email: true } },
        },
        limit,
        offset,
      }),
      this.database
        .select({ value: count() })
        .from(schema.announcementReceiptTable)
        .where(eq(schema.announcementReceiptTable.announcement_id, announcementId)),
    ]);
    
    return {
      data: receipts,
      total: totalResult[0].value,
      currentPage: page,
      totalPages: Math.ceil(totalResult[0].value / limit),
    };
  }

  async acknowledgeReceipt(announcementId: number, userId: number): Promise<schema.TAnnouncementReceiptSelect> {
    const whereClause = and(
      eq(schema.announcementReceiptTable.announcement_id, announcementId),
      eq(schema.announcementReceiptTable.recipient_user_id, userId),
    );

    const existingReceipt = await this.database.query.announcementReceiptTable.findFirst({ where: whereClause });

    if (!existingReceipt) {
      throw new NotFoundException('This announcement was not directed to you, or it does not exist.');
    }

    if (existingReceipt.is_read) {
      return existingReceipt;
    }

    const [updatedReceipt] = await this.database
      .update(schema.announcementReceiptTable)
      .set({ is_read: true, read_at: new Date() })
      .where(whereClause)
      .returning();

    return updatedReceipt;
  }
}