import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { venueTable, TVenueSelect, lessonTable } from '../drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { SchoolService } from '../schools/schools.service';

@Injectable()
export class VenuesService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly schoolService: SchoolService,
  ) {}

  /**
   * Creates a new venue for a school.
   */
  async create(createDto: CreateVenueDto): Promise<TVenueSelect> {
    // Validation 1: Ensure the parent school exists and is active.
    await this.schoolService.findOne(createDto.school_id);

    // Validation 2: Ensure the venue name is unique within the school.
    const existingVenue = await this.db.query.venueTable.findFirst({
        where: and(
            eq(venueTable.school_id, createDto.school_id),
            eq(venueTable.name, createDto.name),
            isNull(venueTable.archived_at)
        )
    });
    if (existingVenue) {
        throw new ConflictException(`A venue named "${createDto.name}" already exists in this school.`);
    }

    const [newVenue] = await this.db.insert(venueTable).values(createDto).returning();
    return newVenue;
  }
  
  /**
   * Finds a single venue by its ID.
   */
  async findOne(id: number): Promise<TVenueSelect> {
    const venue = await this.db.query.venueTable.findFirst({
      where: eq(venueTable.venue_id, id)
    });
    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found.`);
    }
    return venue;
  }

  /**
   * Retrieves all active venues for a specific school.
   */
  async findAllForSchool(schoolId: number): Promise<TVenueSelect[]> {
    await this.schoolService.findOne(schoolId);
    return this.db.query.venueTable.findMany({
        where: and(
            eq(venueTable.school_id, schoolId),
            isNull(venueTable.archived_at)
        ),
        orderBy: (venues, { asc }) => [asc(venues.name)]
    });
  }

  /**
   * Updates an existing venue's details.
   */
  async update(id: number, updateDto: UpdateVenueDto): Promise<TVenueSelect> {
    const venue = await this.findOne(id); // Ensure venue exists

    // If name is being updated, check for uniqueness conflict
    if (updateDto.name && updateDto.name !== venue.name) {
        const existingVenue = await this.db.query.venueTable.findFirst({
            where: and(
                eq(venueTable.school_id, venue.school_id),
                eq(venueTable.name, updateDto.name),
                isNull(venueTable.archived_at)
            )
        });
        if (existingVenue) {
            throw new ConflictException(`A venue named "${updateDto.name}" already exists in this school.`);
        }
    }
    
    const [updatedVenue] = await this.db.update(venueTable).set(updateDto).where(eq(venueTable.venue_id, id)).returning();
    return updatedVenue;
  }

  /**
   * Archives a venue (soft delete).
   */
  async archive(id: number): Promise<{ message: string }> {
    const venue = await this.findOne(id);
    if (venue.archived_at) {
        throw new BadRequestException(`Venue with ID ${id} is already archived.`);
    }

    // Production Check: Before archiving, verify it's not in use by active lessons or future events.
     const activeLessons = await this.db.query.lessonTable.findFirst({ where: eq(lessonTable.venue_id, id) });
     if (activeLessons) {
       throw new ConflictException(`Cannot archive venue as it is currently assigned to active lessons.`);
     }

    await this.db.update(venueTable).set({ archived_at: new Date() }).where(eq(venueTable.venue_id, id));
    return { message: `Venue with ID ${id} has been successfully archived.` };
  }
}