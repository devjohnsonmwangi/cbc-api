import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { lessonContentTable, studentContentProgressTable, TLessonContentSelect, TStudentContentProgressSelect, courseTable } from '../drizzle/schema';
import { eq, and, gt, sql, gte, inArray } from 'drizzle-orm';
import { CreateLessonContentDto } from './dto/create-lesson-content.dto';
import { UpdateLessonContentDto } from './dto/update-lesson-content.dto';
import { CourseModulesService } from '../course-modules/course-modules.service';
import { StudentsService } from '../students/students.service';

@Injectable()
export class LessonContentsService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly modulesService: CourseModulesService,
    private readonly studentsService: StudentsService,
  ) {}

  // --- Content Management ---

  async create(createDto: CreateLessonContentDto): Promise<TLessonContentSelect> {
    const { module_id, order } = createDto;
    await this.modulesService.findOne(module_id);

    // Atomically reorder subsequent content items to make space.
    await this.db.update(lessonContentTable)
        .set({ order: sql`${lessonContentTable.order} + 1` })
        .where(and(
            eq(lessonContentTable.module_id, module_id),
            gte(lessonContentTable.order, order)
        ));

    const [newContent] = await this.db.insert(lessonContentTable).values(createDto).returning();
    return newContent;
  }

  async findOne(id: number): Promise<TLessonContentSelect> {
    const content = await this.db.query.lessonContentTable.findFirst({
        where: eq(lessonContentTable.content_id, id),
    });
    if (!content) {
      throw new NotFoundException(`Lesson content with ID ${id} not found.`);
    }
    return content;
  }

  async findAllByModule(moduleId: number): Promise<TLessonContentSelect[]> {
    await this.modulesService.findOne(moduleId);
    return this.db.query.lessonContentTable.findMany({
        where: eq(lessonContentTable.module_id, moduleId),
        orderBy: (c, { asc }) => [asc(c.order)]
    });
  }

  async update(id: number, updateDto: UpdateLessonContentDto): Promise<TLessonContentSelect> {
    await this.findOne(id);
    const [updatedContent] = await this.db.update(lessonContentTable)
        .set(updateDto)
        .where(eq(lessonContentTable.content_id, id))
        .returning();
    return updatedContent;
  }

  async delete(id: number): Promise<{ message: string }> {
    const contentToDelete = await this.findOne(id);
    
    await this.db.transaction(async (tx) => {
        await tx.delete(lessonContentTable).where(eq(lessonContentTable.content_id, id));
        
        await tx.update(lessonContentTable)
            .set({ order: sql`${lessonContentTable.order} - 1` })
            .where(and(
                eq(lessonContentTable.module_id, contentToDelete.module_id),
                gt(lessonContentTable.order, contentToDelete.order)
            ));
    });

    return { message: `Lesson content with ID ${id} has been successfully deleted.` };
  }

  // --- Student Progress Management ---

  async markProgress(contentId: number, studentId: number, isCompleted: boolean): Promise<TStudentContentProgressSelect> {
    // Validate that both the content and the student exist
    await this.findOne(contentId);
    await this.studentsService.findOne(studentId);

    const existingProgress = await this.db.query.studentContentProgressTable.findFirst({
        where: and(
            eq(studentContentProgressTable.content_id, contentId),
            eq(studentContentProgressTable.student_id, studentId)
        )
    });

    if (existingProgress) {
        // Update existing progress record
        const [updatedProgress] = await this.db.update(studentContentProgressTable)
            .set({ is_completed: isCompleted, completed_at: isCompleted ? new Date() : null })
            .where(eq(studentContentProgressTable.progress_id, existingProgress.progress_id))
            .returning();
        return updatedProgress;
    } else {
        // Create a new progress record
        const [newProgress] = await this.db.insert(studentContentProgressTable)
            .values({
                content_id: contentId,
                student_id: studentId,
                is_completed: isCompleted,
                completed_at: isCompleted ? new Date() : null,
            })
            .returning();
        return newProgress;
    }
  }

  async getStudentProgressForCourse(studentId: number, courseId: number): Promise<any> {
    // This is a powerful query that gets all content for a course and joins the student's progress
    const course = await this.db.query.courseTable.findFirst({
        where: eq(courseTable.course_id, courseId),
        with: {
            modules: {
                with: {
                    contents: true
                }
            }
        }
    });
    if (!course) throw new NotFoundException(`Course with ID ${courseId} not found.`);

    const allContentIds = course.modules.flatMap(m => m.contents.map(c => c.content_id));
    if (allContentIds.length === 0) return [];

    const progressRecords = await this.db.query.studentContentProgressTable.findMany({
        where: and(
            eq(studentContentProgressTable.student_id, studentId),
            inArray(studentContentProgressTable.content_id, allContentIds)
        )
    });
    
    const progressMap = new Map(progressRecords.map(p => [p.content_id, p]));

    // Join the data in code to provide a clean response
    return course.modules.map(module => ({
        ...module,
        contents: module.contents.map(content => ({
            ...content,
            progress: progressMap.get(content.content_id) || { is_completed: false, completed_at: null }
        }))
    }));
  }
}