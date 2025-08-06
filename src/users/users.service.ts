//developed    with  NestJS   ,   
//  TypeScript   ,   and   Drizzle ORM
//  developed  by   senior  developer   Eng Johnson Mwangi
//  this   code  is  part  of  a  school management system API
//  this   code  is  for  managing  users  in  the   school
//any  issues  or   bugs  should    be  reported  to   the   developer  team:  senior developer Eng Johnson Mwangi
//my   email:
//johnsonthuraniramwangi@gmail.com
//or our   developer  team email: Gmail jomulimited2@gmail.com

import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, isNull } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import * as schema from '../drizzle/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SchoolService } from '../schools/schools.service'; // CORRECTED PATH
import { TUserSelect } from '../drizzle/schema';

type FullUserWithRoles = TUserSelect & { roles: { role: string }[] };

@Injectable()
export class UserService {
  private readonly saltRounds: number;

  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly schoolService: SchoolService,
    private readonly configService: ConfigService, // Inject ConfigService
  ) {
    // Load salt rounds from config for better security management
    this.saltRounds = parseInt(this.configService.get<string>('PASSWORD_SALT_ROUNDS', '10'));
  }

  /**
   * Hashes a plain text password using bcrypt.
   * @param password The plain text password.
   * @returns A promise that resolves to the hashed password.
   */
  private async _hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Helper function to remove sensitive fields from user object before returning to client.
   * @param user The user object from the database.
   * @returns A secure user object without password or 2FA secret.
   */
  private _secureUser(user: any) {
    const { password, two_factor_secret, ...secureUser } = user;
    return secureUser;
  }
//this   is  an   asnchronous function that creates a new user in the database. 
//this   what  it  does 
  /**
   * Creates a new user in the database.
   * @param createUserDto The data transfer object containing user details.
   * @param creatorRoles The roles of the user creating this new user.
   * @returns The newly created user object, secured without sensitive fields.
   */
//note   to  developers:
  // Ensure that the creator has the necessary permissions to create users with specific roles.
  // Implement role-based access control to prevent unauthorized user creation.
  // Validate the input data thoroughly to prevent SQL injection and other security issues.



  async create(createUserDto: CreateUserDto, creatorRoles: string[]) {
    const { roles, ...userData } = createUserDto;

    if (roles.includes('super_admin') && !creatorRoles.includes('super_admin')) {
      throw new ForbiddenException('Only a super_admin can create another super_admin.');
    }

    if (roles.includes('super_admin')) {
      if (userData.school_id) {
        throw new BadRequestException('Super admins cannot be assigned to a school.');
      }
      userData.school_id = undefined; // Correctly set to undefined for the database
    } else {
      if (!userData.school_id) {
        throw new BadRequestException('A school_id is required for non-super_admin roles.');
      }
      await this.schoolService.findOne(userData.school_id);
    }

    const existingUser = await this.db.query.userTable.findFirst({
      where: eq(schema.userTable.email, userData.email),
    });
    if (existingUser) {
      throw new ConflictException(`User with email '${userData.email}' already exists.`);
    }

    const hashedPassword = await this._hashPassword(userData.password);
    const userToInsert = { ...userData, password: hashedPassword };

    const newUser = await this.db.transaction(async (tx) => {
      const [insertedUser] = await tx.insert(schema.userTable).values(userToInsert).returning();
      const rolesToInsert = roles.map((role) => ({ user_id: insertedUser.user_id, role }));
      await tx.insert(schema.userRoleLinkTable).values(rolesToInsert);
      return insertedUser;
    });

    return this._secureUser(newUser);
  }

  async findAllBySchool(schoolId: number) {
    const users = await this.db.query.userTable.findMany({
      where: and(eq(schema.userTable.school_id, schoolId), isNull(schema.userTable.archived_at)),
      with: { roles: { columns: { role: true } } },
      orderBy: (table, { asc }) => [asc(table.full_name)],
    });
    return users.map(this._secureUser);
  }

  async findOne(id: number) {
    const user = await this.db.query.userTable.findFirst({
      where: and(eq(schema.userTable.user_id, id), isNull(schema.userTable.archived_at)),
      with: { roles: { columns: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found or has been archived.`);
    }
    return this._secureUser(user);
  }
  
  /**
   * Finds a user by email for internal auth. Returns the full user object including password hash.
   * This method intentionally does NOT throw a 'NotFoundException' to prevent email enumeration.
   * @param email The user's email.
   * @returns The full user object or undefined if not found.
   */
  async findOneByEmail(email: string): Promise<FullUserWithRoles | undefined> {
    return this.db.query.userTable.findFirst({
      where: and(eq(schema.userTable.email, email), isNull(schema.userTable.archived_at)),
      with: { roles: { columns: { role: true } } },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const { roles, ...userData } = updateUserDto;
    await this.findOne(id); // Ensures user exists and is not archived

    return this.db.transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx
          .update(schema.userTable)
          .set({ ...userData, updated_at: new Date() })
          .where(eq(schema.userTable.user_id, id));
      }

      if (roles && roles.length > 0) {
        await tx.delete(schema.userRoleLinkTable).where(eq(schema.userRoleLinkTable.user_id, id));
        const rolesToInsert = roles.map((role) => ({ user_id: id, role }));
        await tx.insert(schema.userRoleLinkTable).values(rolesToInsert);
      }
      
      const finalUser = await tx.query.userTable.findFirst({
        where: eq(schema.userTable.user_id, id),
        with: { roles: { columns: { role: true } } },
      });

      return this._secureUser(finalUser);
    });
  }

  async archive(id: number) {
    await this.findOne(id);
    await this.db
      .update(schema.userTable)
      .set({ archived_at: new Date() })
      .where(eq(schema.userTable.user_id, id));
      
    return { message: `User with ID ${id} has been successfully archived.` };
  }
}