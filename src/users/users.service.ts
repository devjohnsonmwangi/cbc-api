import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import {  DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import * as schema from '../drizzle/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SchoolService } from '../schools/schools.service';
import { TUserSelect } from '../drizzle/schema';

@Injectable()
export class UserService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly schoolService: SchoolService,
  ) {}

  /**
   * Helper function to remove sensitive fields from user object before returning to client.
   * @param user - The user object from the database.
   * @returns A secure user object without password or 2FA secret.
   */
  private secureUser(user: any) {
    const { password, two_factor_secret, ...secureUser } = user;
    return secureUser;
  }

  /**
   * Creates a new user and links them to their roles.
   * Handles logic for super_admin vs. regular school users.
   * @param createUserDto - Data for the new user.
   * @param creatorRoles - Roles of the user performing the creation, for permission checks.
   * @returns The newly created, secured user object.
   */
  async create(createUserDto: CreateUserDto, creatorRoles: string[]) {
    const { roles, ...userData } = createUserDto;

    // --- Permission Checks ---
    if (roles.includes('super_admin') && !creatorRoles.includes('super_admin')) {
      throw new ForbiddenException('Only a super_admin can create another super_admin.');
    }

    // --- Business Logic ---
    if (roles.includes('super_admin')) {
      if (userData.school_id) {
        throw new BadRequestException('Super admins cannot be assigned to a school.');
      }
      userData.school_id = undefined; // Ensure it's undefined
    } else {
      if (!userData.school_id) {
        throw new BadRequestException('A school_id is required for non-super_admin roles.');
      }
      await this.schoolService.findOne(userData.school_id); // Verify the school exists
    }

    const existingUser = await this.db.query.userTable.findFirst({
      where: eq(schema.userTable.email, userData.email),
    });
    if (existingUser) {
      throw new ConflictException(`User with email '${userData.email}' already exists.`);
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const userToInsert = { ...userData, password: hashedPassword };

    const newUser = await this.db.transaction(async (tx) => {
      const [insertedUser] = await tx.insert(schema.userTable).values(userToInsert).returning();
      const rolesToInsert = roles.map((role) => ({ user_id: insertedUser.user_id, role }));
      await tx.insert(schema.userRoleLinkTable).values(rolesToInsert);
      return insertedUser;
    });

    return this.secureUser(newUser);
  }

  /**
   * Finds all non-archived users for a given school.
   * @param schoolId - The ID of the school.
   * @returns An array of secure user objects with their roles.
   */
  async findAllBySchool(schoolId: number) {
    const users = await this.db.query.userTable.findMany({
      where: and(
        eq(schema.userTable.school_id, schoolId),
        isNull(schema.userTable.archived_at),
      ),
      with: { roles: { columns: { role: true } } },
      orderBy: (users, { asc }) => [asc(users.full_name)],
    });
    return users.map(this.secureUser);
  }

  /**
   * Finds a single user by ID, ensuring they are not archived.
   * @param id - The user's ID.
   * @returns The full user object with roles (but still secured).
   */
  async findOne(id: number) {
    const user = await this.db.query.userTable.findFirst({
      where: and(eq(schema.userTable.user_id, id), isNull(schema.userTable.archived_at)),
      with: { roles: { columns: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found or has been archived.`);
    }
    return this.secureUser(user);
  }
  
  /**
   * Finds a user by email for internal authentication purposes.
   * This is the ONLY method that should return the password hash.
   * @param email - The user's email.
   * @returns The full, un-secured user object including password and roles.
   */
  async findOneByEmail(email: string): Promise<TUserSelect & { roles: { role: string }[] }> {
    const user = await this.db.query.userTable.findFirst({
      where: and(eq(schema.userTable.email, email), isNull(schema.userTable.archived_at)),
      with: { roles: { columns: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException(`User with email '${email}' not found or has been archived.`);
    }
    return user;
  }

  /**
   * Updates a user's details and/or roles.
   * @param id - The ID of the user to update.
   * @param updateUserDto - The data to update.
   * @returns The updated, secure user object.
   */
  async update(id: number, updateUserDto: UpdateUserDto) {
    const { roles, ...userData } = updateUserDto;
    await this.findOne(id); // Ensure user exists

    return this.db.transaction(async (tx) => {
      let updatedUser;
      if (Object.keys(userData).length > 0) {
        [updatedUser] = await tx
          .update(schema.userTable)
          .set({ ...userData, updated_at: new Date() })
          .where(eq(schema.userTable.user_id, id))
          .returning();
      }

      if (roles) {
        await tx.delete(schema.userRoleLinkTable).where(eq(schema.userRoleLinkTable.user_id, id));
        const rolesToInsert = roles.map((role) => ({ user_id: id, role }));
        await tx.insert(schema.userRoleLinkTable).values(rolesToInsert);
      }
      
      // Re-fetch the user to get a consistent object with all changes
      const finalUser = await tx.query.userTable.findFirst({
          where: eq(schema.userTable.user_id, id),
          with: { roles: { columns: { role: true } } }
      });

      return this.secureUser(finalUser);
    });
  }

  /**
   * Archives a user (soft delete).
   * @param id - The ID of the user to archive.
   * @returns A success message.
   */
  async archive(id: number) {
    await this.findOne(id); // Ensure user exists
    await this.db
      .update(schema.userTable)
      .set({ archived_at: new Date() })
      .where(eq(schema.userTable.user_id, id));
      
    return { message: `User with ID ${id} has been successfully archived.` };
  }
}