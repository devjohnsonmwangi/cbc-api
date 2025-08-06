import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { classTable, TClassSelect } from '../drizzle/schema';
import { eq, and, isNull, ne } from 'drizzle-orm';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { SchoolService } from '../schools/schools.service';
import { UserService } from '../users/users.service';

@Injectable()
export class ClassesService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    // Inject services from imported modules
    private readonly schoolService: SchoolService,
    private readonly userService: UserService,
  ) {}

  async create(createDto: CreateClassDto): Promise<TClassSelect> {
    const { school_id, grade_level, stream_name, class_teacher_id } = createDto;

    // Validation 1: Ensure parent school exists and is active.
    await this.schoolService.findOne(school_id);

    // Validation 2: If a class teacher is assigned, ensure they exist and have the 'teacher' role.
    if (class_teacher_id) {
      const teacher = await this.userService.findOne(class_teacher_id);
      // Your UserService findOne method returns an object with a 'roles' array.
      if (!teacher.roles.some((r: { role: string }) => r.role === 'teacher')) {
        throw new BadRequestException(`User with ID ${class_teacher_id} is not a registered teacher.`);
      }
    }

    // Validation 3: Prevent duplicate classes (same grade and stream) in the same school.
    const uniqueStreamName = stream_name || ''; // Treat null/undefined as an empty string for a consistent unique key.
    const existingClass = await this.db.query.classTable.findFirst({
        where: and(
            eq(classTable.school_id, school_id),
            eq(classTable.grade_level, grade_level),
            eq(classTable.stream_name, uniqueStreamName),
            isNull(classTable.archived_at),
        ),
    });
    if (existingClass) {
        throw new ConflictException(`A class for ${grade_level} with stream "${stream_name || 'N/A'}" already exists.`);
    }

    const [newClass] = await this.db.insert(classTable).values(createDto).returning();
    return newClass;
  }

  async findOne(id: number): Promise<TClassSelect> {
    const cls = await this.db.query.classTable.findFirst({
      where: eq(classTable.class_id, id),
      with: { 
        classTeacher: {
            columns: { // Explicitly select columns to avoid exposing password hash etc.
                user_id: true,
                full_name: true,
                email: true,
            }
        } 
      }
    });
    if (!cls) {
      throw new NotFoundException(`Class with ID ${id} not found.`);
    }
    return cls;
  }

  async findAllForSchool(schoolId: number): Promise<TClassSelect[]> {
    await this.schoolService.findOne(schoolId);
    return this.db.query.classTable.findMany({
        where: and(
            eq(classTable.school_id, schoolId),
            isNull(classTable.archived_at)
        ),
        orderBy: (classes, { asc }) => [asc(classes.grade_level), asc(classes.stream_name)],
        with: { 
            classTeacher: {
                columns: {
                    user_id: true,
                    full_name: true,
                }
            } 
        }
    });
  }

  async update(id: number, updateDto: UpdateClassDto): Promise<TClassSelect> {
    // Ensure the class exists before trying to update it.
    await this.findOne(id);
    const [updatedClass] = await this.db
        .update(classTable)
        .set(updateDto)
        .where(eq(classTable.class_id, id))
        .returning();
    return updatedClass;
  }

  async archive(id: number): Promise<{ message: string }> {
    const cls = await this.findOne(id);
    if (cls.archived_at) {
        throw new BadRequestException(`Class with ID ${id} is already archived.`);
    }
    // Production check: You would add a check here for active student enrollments.
    // e.g., const enrollments = await this.enrollmentService.findForClass(id);
    // if (enrollments.length > 0) throw new ConflictException(...)
    
    await this.db.update(classTable).set({ archived_at: new Date() }).where(eq(classTable.class_id, id));
    return { message: `Class with ID ${id} has been successfully archived.` };
  }
}