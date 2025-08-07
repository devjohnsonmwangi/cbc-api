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
import { SchoolService } from '../schools/schools.service';
import { TUserSelect } from '../drizzle/schema';

type FullUserWithRoles = TUserSelect & { roles: { role: string }[] };

@Injectable()
export class UserService {
  private readonly saltRounds: number;

  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly schoolService: SchoolService,
    private readonly configService: ConfigService,
  ) {
    this.saltRounds = parseInt(this.configService.get<string>('PASSWORD_SALT_ROUNDS', '10'));
  }

  private async _hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  private _secureUser(user: any) {
    const { password, two_factor_secret, ...secureUser } = user;
    return secureUser;
  }

  async create(createUserDto: CreateUserDto, creatorRoles: string[]) {
    const { roles, ...userData } = createUserDto;

    if (roles.includes('super_admin') && !creatorRoles.includes('super_admin')) {
      throw new ForbiddenException('Only a super_admin can create another super_admin.');
    }

    if (roles.includes('super_admin')) {
      if (userData.school_id) {
        throw new BadRequestException('Super admins cannot be assigned to a school.');
      }
      (userData as any).school_id = null; // Ensure it's null, not undefined
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
      if (roles && roles.length > 0) {
        const rolesToInsert = roles.map((role) => ({ user_id: insertedUser.user_id, role }));
        await tx.insert(schema.userRoleLinkTable).values(rolesToInsert);
      }
      return insertedUser;
    });

    return this._secureUser(newUser);
  }

  /**
   * Finds all non-archived users for a given school.
   * Can optionally filter to only include users with a specific role.
   * @param schoolId - The ID of the school.
   * @param options - Optional: Specify `withRole` to filter by a user role (e.g., 'teacher').
   * @returns A list of secure user objects.
   */
  async findAllBySchool(schoolId: number, options: { withRole?: string } = {}) {
    // Base query to get all users in the school with their roles
    const users = await this.db.query.userTable.findMany({
      where: and(eq(schema.userTable.school_id, schoolId), isNull(schema.userTable.archived_at)),
      with: { roles: { columns: { role: true } } },
      orderBy: (table, { asc }) => [asc(table.full_name)],
    });

    // If the withRole option is provided, perform a JavaScript filter on the results.
    // This is efficient for a reasonable number of users per school.
    if (options.withRole) {
        const filteredUsers = users.filter(user => 
            user.roles.some(r => r.role === options.withRole)
        );
        return filteredUsers.map(this._secureUser);
    }

    // If no role filter is specified, return all users.
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

      if (!finalUser) {
        // This case should theoretically not happen if findOne(id) succeeds, but it's a good safeguard.
        throw new NotFoundException(`User with ID ${id} could not be found after update.`);
      }

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