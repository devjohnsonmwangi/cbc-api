import {
  Injectable,
  UnauthorizedException,
  Inject,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { eq, and, gt, sql } from 'drizzle-orm';
import { addDays, addMinutes } from 'date-fns';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import * as schema from '../drizzle/schema';
import { TUserSelect, TUserInsert, schoolRoleEnum } from '../drizzle/schema';
import { UserService } from '../users/users.service';
import { MailService } from '../mailer/mailer.service';

// A consistent type for the user object returned from the database with roles
type FullUserWithRoles = TUserSelect & { roles: { role: { role_name: string } }[] };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private readonly database: DrizzleDB,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    if (process.env.NODE_ENV !== 'production') {
      if (
        !this.configService.get<string>('JWT_SECRET') ||
        !this.configService.get<string>('JWT_REFRESH_SECRET')
      ) {
        this.logger.error(
          'FATAL ERROR: JWT secrets are not loaded. Check your .env file and ConfigModule setup.',
        );
        process.exit(1);
      }
    }
  }

  /**
   * Handles public user registration. The first user becomes a 'super_admin'.
   * @param registrationData Data for the new user (name, email, password).
   */
  async register(registrationData: Omit<TUserInsert, 'id' | 'roles' | 'school_id'>) {
    const existingUser = await this.userService.findOneByEmail(registrationData.email);
    if (existingUser) {
      throw new ConflictException(`A user with the email '${registrationData.email}' already exists.`);
    }

    const [userCountResult] = await this.database.select({ count: sql<number>`count(*)` }).from(schema.userTable);
    const isFirstUser = Number(userCountResult.count) === 0;

    const rolesToAssign: (typeof schoolRoleEnum.enumValues)[number][] = isFirstUser ? ['super_admin'] : ['parent'];

    const userToCreate = {
      ...registrationData,
      roles: rolesToAssign,
      phone_number: registrationData.phone_number || undefined,
    };

    const newUser = await this.userService.create(userToCreate, rolesToAssign);

    await this.mailService.sendWelcomeEmail(newUser);

    return { message: `Registration successful for ${newUser.email}. Please check your email to get started.` };
  }

  /**
   * [SECURE] Validates user credentials with a generic error message to prevent user enumeration.
   * @param email The user's email.
   * @param password The plain-text password provided by the user.
   * @returns The full user object with roles if credentials are valid.
   * @throws UnauthorizedException for any failure (email not found OR wrong password).
   */
  async validateUser(email: string, password: string): Promise<FullUserWithRoles> {
    this.logger.log(`Attempting to validate user: ${email}`);
    const user = await this.userService.findOneByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      this.logger.warn(`Invalid login attempt for email: ${email}.`);
      throw new UnauthorizedException('Invalid credentials. Please check your email and password.');
    }

    this.logger.log(`Successfully validated user: ${email}`);
    // Transform roles to expected structure
    const userWithRoles: FullUserWithRoles = {
      ...user,
      roles: user.roles.map((r: { role: string }) => ({
        role: { role_name: r.role }
      }))
    };
    return userWithRoles;
  }

  /**
   * Handles the login process after a user has been validated.
   * @param user The validated user object.
   * @returns An object containing the access_token and refresh_token.
   */
  async login(user: FullUserWithRoles) {
    const tokens = await this.generateTokens(user);
    await this.updateUserSession(user.user_id, tokens.refresh_token);
    this.logger.log(`User logged in and session created for user ID: ${user.user_id}`);
    return tokens;
  }

  /**
   * Logs a user out by deleting their session from the database.
   * @param userId The ID of the user to log out.
   */
  async logout(userId: number) {
    await this.database.delete(schema.userSessionTable).where(eq(schema.userSessionTable.user_id, userId));
    this.logger.log(`User logged out and session deleted for user ID: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  /**
   * Refreshes authentication tokens using a valid refresh token.
   * @param userId The user ID from the refresh token payload.
   * @param refreshToken The raw refresh token string from the client.
   * @returns A new set of access and refresh tokens.
   */
  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.userService.findOne(userId);
    if (!user) throw new UnauthorizedException('Access Denied: User not found.');

    const session = await this.database.query.userSessionTable.findFirst({ where: eq(schema.userSessionTable.user_id, userId) });
    if (!session || !session.token) throw new UnauthorizedException('Access Denied: No active session found.');
    if (refreshToken !== session.token) throw new UnauthorizedException('Access Denied: Invalid refresh token.');

    const fullUser = await this.userService.findOneByEmail(user.email);
    if (!fullUser) {
      throw new InternalServerErrorException('Could not refresh token for a non-existent user.');
    }

    // Transform roles to expected structure
    const userWithRoles: FullUserWithRoles = {
      ...fullUser,
      roles: fullUser.roles.map((r: { role: string }) => ({
        role: { role_name: r.role }
      }))
    };

    const newTokens = await this.generateTokens(userWithRoles);
    await this.updateUserSession(user.user_id, newTokens.refresh_token);
    return newTokens;
  }

  /**
   * [SECURE] Initiates the password reset process by generating a token and sending an email.
   * It intentionally returns a generic message for non-existent emails to prevent user enumeration.
   * @param email The email of the user requesting a password reset.
   */
  async requestPasswordReset(email: string) {
    const user = await this.userService.findOneByEmail(email);

    if (!user) {
      this.logger.log(`Password reset requested for a non-existent email: ${email}. No action taken, returning generic success response.`);
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addMinutes(new Date(), 30); // Token is valid for 30 minutes

    try {
      await this.database.insert(schema.passwordResetTokenTable)
        .values({ user_id: user.user_id, token, expires_at: expiresAt })
        .onConflictDoUpdate({ target: schema.passwordResetTokenTable.user_id, set: { token, expires_at: expiresAt } });

      const resetUrl = `${this.configService.get('FRONTEND_URL')}/password-reset?token=${token}`;
      await this.mailService.sendPasswordResetEmail(user, resetUrl);

      this.logger.log(`Password reset email successfully sent to user ID: ${user.user_id}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to send password reset email for user ID: ${user.user_id}`, error.stack);
      } else {
        this.logger.error(`Failed to send password reset email for user ID: ${user.user_id}`);
      }
      throw new InternalServerErrorException('Could not process password reset request. Please try again later.');
    }
    
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  /**
   * Completes the password reset process using a valid token and new password.
   * @param token The password reset token from the email link.
   * @param newPassword The new password to set for the user.
   */
  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await this.database.query.passwordResetTokenTable.findFirst({
      where: and(eq(schema.passwordResetTokenTable.token, token), gt(schema.passwordResetTokenTable.expires_at, new Date())),
    });

    if (!resetRecord) {
      throw new BadRequestException('This password reset link is invalid or has expired. Please request a new one.');
    }

    const saltRounds = parseInt(this.configService.get<string>('PASSWORD_SALT_ROUNDS', '10'));
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    try {
      await this.database.transaction(async (transaction) => {
        const userToUpdate = await transaction.query.userTable.findFirst({ where: eq(schema.userTable.user_id, resetRecord.user_id) });

        if (!userToUpdate) {
          this.logger.warn(`Attempted to reset password for a deleted user ID: ${resetRecord.user_id}`);
          await transaction.update(schema.passwordResetTokenTable).set({ expires_at: new Date() }).where(eq(schema.passwordResetTokenTable.id, resetRecord.id));
          throw new NotFoundException('The user associated with this token no longer exists.');
        }

        await transaction.update(schema.userTable).set({ password: hashedPassword, updated_at: new Date() }).where(eq(schema.userTable.user_id, resetRecord.user_id));
        await transaction.update(schema.passwordResetTokenTable).set({ expires_at: new Date() }).where(eq(schema.passwordResetTokenTable.id, resetRecord.id));
      });

      this.logger.log(`Password has been successfully reset for user ID: ${resetRecord.user_id}`);
      return { message: 'Your password has been reset successfully.' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Error) {
        this.logger.error(`Transaction failed during password reset for token: ${token}`, error.stack);
      } else {
        this.logger.error(`Transaction failed during password reset for token: ${token}`);
      }
      throw new InternalServerErrorException('An unexpected error occurred while resetting your password. Please try again.');
    }
  }

  /**
   * Private helper to create or update a user's session with a new refresh token.
   */
  private async updateUserSession(userId: number, refreshToken: string) {
    const refreshExpiryDays = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME', '7d').replace('d', ''));
    const expiresAt = addDays(new Date(), refreshExpiryDays);
    await this.database.insert(schema.userSessionTable)
      .values({ user_id: userId, token: refreshToken, expires_at: expiresAt })
      .onConflictDoUpdate({ target: schema.userSessionTable.user_id, set: { token: refreshToken, expires_at: expiresAt } });
  }

  /**
   * Private helper to generate new access and refresh tokens for a user.
   */
  private async generateTokens(user: FullUserWithRoles) {
    const payload = {
      sub: user.user_id,
      email: user.email,
      school_id: user.school_id,
      roles: user.roles,
    };

    const accessTokenSecret = this.configService.get<string>('JWT_SECRET');
    const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessTokenSecret,
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION_TIME', '15m'),
      }),
      this.jwtService.signAsync({ sub: user.user_id }, {
        secret: refreshTokenSecret,
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME', '7d'),
      }),
    ]);

    return { access_token: accessToken, refresh_token: refreshToken };    }
} 