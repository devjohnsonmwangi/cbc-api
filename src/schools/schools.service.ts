import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, isNull, and } from 'drizzle-orm';
import {  DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import * as schema from '../drizzle/schema';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolService {
  constructor(@Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB) {}

  /**
   * Creates a new school.
   * This should only be accessible by a super_admin.
   * @param createSchoolDto - Data for the new school.
   * @returns The newly created school record.
   */
  async create(createSchoolDto: CreateSchoolDto) {
    const [newSchool] = await this.db
      .insert(schema.schoolTable)
      .values(createSchoolDto)
      .returning();

    return newSchool;
  }

  /**
   * Finds all non-archived schools.
   * This should only be accessible by a super_admin.
   * @returns An array of school records.
   */
  async findAll() {
    return this.db.query.schoolTable.findMany({
      where: isNull(schema.schoolTable.archived_at),
      orderBy: (schools, { asc }) => [asc(schools.name)],
    });
  }

  /**
   * Finds a single school by its ID, ensuring it is not archived.
   * @param id - The ID of the school to find.
   * @returns The school record.
   * @throws NotFoundException if the school is not found or is archived.
   */
  async findOne(id: number) {
    const school = await this.db.query.schoolTable.findFirst({
      where: and(
        eq(schema.schoolTable.school_id, id),
        isNull(schema.schoolTable.archived_at),
      ),
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${id} not found or has been archived.`);
    }
    return school;
  }

  /**
   * Updates a school's details.
   * @param id - The ID of the school to update.
   * @param updateSchoolDto - The data to update.
   * @returns The updated school record.
   */
  async update(id: number, updateSchoolDto: UpdateSchoolDto) {
    // Ensure the school exists and is not archived before updating
    await this.findOne(id);

    const [updatedSchool] = await this.db
      .update(schema.schoolTable)
      .set({ ...updateSchoolDto, updated_at: new Date() })
      .where(eq(schema.schoolTable.school_id, id))
      .returning();

    return updatedSchool;
  }

  /**
   * Archives a school by setting the 'archived_at' timestamp.
   * This is a soft delete.
   * @param id - The ID of the school to archive.
   * @returns A success message.
   */
  async archive(id: number) {
    // Ensure the school exists and is not archived before archiving
    await this.findOne(id);

    await this.db
      .update(schema.schoolTable)
      .set({ archived_at: new Date() })
      .where(eq(schema.schoolTable.school_id, id));

    return { message: `School with ID ${id} has been successfully archived.` };
  }
}