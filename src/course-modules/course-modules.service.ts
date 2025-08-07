import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { courseModuleTable, TCourseModuleSelect } from '../drizzle/schema';
import { eq, and, gt, sql,gte } from 'drizzle-orm';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { CoursesService } from '../courses/courses.service';

@Injectable()
export class CourseModulesService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly coursesService: CoursesService,
  ) {}

  /**
   * Creates a new module within a course and handles reordering of subsequent modules.
   */
  async create(createDto: CreateCourseModuleDto): Promise<TCourseModuleSelect> {
    const { course_id, title, order } = createDto;

    // Validation 1: Ensure the parent course exists and is not archived.
    const course = await this.coursesService.findOne(course_id);
    if (course.archived_at) {
        throw new BadRequestException('Cannot add modules to an archived course.');
    }

    // Validation 2: Prevent duplicate titles or order numbers within the same course.
    const existingModule = await this.db.query.courseModuleTable.findFirst({
        where: and(
            eq(courseModuleTable.course_id, course_id),
            eq(courseModuleTable.title, title)
        )
    });
    if (existingModule) {
        throw new ConflictException(`A module with the title "${title}" already exists in this course.`);
    }

    // Production-level Logic: Atomically reorder subsequent modules to make space for the new one.
    await this.db.transaction(async (tx) => {
        // Increment the order of all modules that come after the new module's desired position.
        await tx.update(courseModuleTable)
            .set({ order: sql`${courseModuleTable.order} + 1` })
            .where(and(
                eq(courseModuleTable.course_id, course_id),
                gte(courseModuleTable.order, order)
            ));
    });

    const [newModule] = await this.db.insert(courseModuleTable).values(createDto).returning();
    return newModule;
  }

  /**
   * Retrieves a single course module by its ID.
   */
  async findOne(id: number): Promise<TCourseModuleSelect> {
    const module = await this.db.query.courseModuleTable.findFirst({
        where: eq(courseModuleTable.module_id, id),
    });
    if (!module) {
      throw new NotFoundException(`Course module with ID ${id} not found.`);
    }
    return module;
  }

  /**
   * Finds all modules for a given course, sorted by their order.
   */
  async findAllByCourse(courseId: number): Promise<any[]> {
    await this.coursesService.findOne(courseId); // Validate course exists
    return this.db.query.courseModuleTable.findMany({
        where: eq(courseModuleTable.course_id, courseId),
        with: {
            contents: true // Also load the content within each module
        },
        orderBy: (m, { asc }) => [asc(m.order)]
    });
  }

  /**
   * Updates an existing course module.
   */
  async update(id: number, updateDto: UpdateCourseModuleDto): Promise<TCourseModuleSelect> {
    await this.findOne(id); // Ensure module exists
    const [updatedModule] = await this.db.update(courseModuleTable)
        .set(updateDto)
        .where(eq(courseModuleTable.module_id, id))
        .returning();
    return updatedModule;
  }

  /**
   * Deletes a course module and reorders the remaining modules to close the gap.
   */
  async delete(id: number): Promise<{ message: string }> {
    const moduleToDelete = await this.findOne(id);
    
    // Production-level Logic: Atomically delete and reorder.
    await this.db.transaction(async (tx) => {
        // Delete the target module
        await tx.delete(courseModuleTable).where(eq(courseModuleTable.module_id, id));
        
        // Decrement the order of all modules that came after the deleted one.
        await tx.update(courseModuleTable)
            .set({ order: sql`${courseModuleTable.order} - 1` })
            .where(and(
                eq(courseModuleTable.course_id, moduleToDelete.course_id),
                gt(courseModuleTable.order, moduleToDelete.order)
            ));
    });

    return { message: `Course module with ID ${id} has been successfully deleted.` };
  }
}