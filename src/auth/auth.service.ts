import { Injectable, UnauthorizedException, Inject, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { eq, and, gt, sql } from 'drizzle-orm';
import { addDays, addMinutes } from 'date-fns';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import * as schema from '../drizzle/schema';
import { TUserSelect, TUserInsert, schoolRoleEnum } from '../drizzle/schema';
import { UserService } from '../users/users.service'; // Corrected path
import { MailService } from '../mailer/mailer.service';

// A consistent type for the user object returned from the database with roles
type FullUserWithRoles = TUserSelect & { roles: { role: string }[] };

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private userService: UserService,
    private jwtService: JwtService,

    private configService: ConfigService,
    private mailService: MailService,
  ) {
    // A quick check during startup in development to ensure secrets are loaded.
    if (process.env.NODE_ENV !== 'production') {
        if (!configService.get<string>('JWT_SECRET') || !configService.get<string>('JWT_REFRESH_SECRET')) {
            console.error('FATAL ERROR: JWT secrets are not loaded. Check your .env file and ConfigModule setup.');
            process.exit(1);
        }
    }
  }

  /**
   * Handles public user registration.
   * The first user to ever register automatically becomes a 'super_admin'.
   * All subsequent users receive a default role (e.g., 'parent').
   * @param registerDto Data for the new user (name, email, password).
   */
  async register(registerDto: Omit<TUserInsert, 'id' | 'roles' | 'school_id'>) {
    const existingUser = await this.userService.findOneByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const [userCountResult] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.userTable);
    const isFirstUser = Number(userCountResult.count) === 0;

    const rolesToAssign: (typeof schoolRoleEnum.enumValues)[number][] = isFirstUser ? ['super_admin'] : ['parent'];

    const userToCreate = { 
      ...registerDto,
      roles: rolesToAssign,
      phone_number: registerDto.phone_number || undefined,
    };

    const newUser = await this.userService.create(userToCreate, rolesToAssign);
    
    // In a real app, you would also store this token and have a verification flow.
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`;
    
    await this.mailService.sendWelcomeEmail(newUser);

    return { message: `Registration successful for ${newUser.email}. Please check your email to get started.` };
  }
  
  /**
   * Validates user credentials against the database.
   * @param email The user's email.
   * @param pass The plain-text password provided by the user.
   * @returns The full user object with roles if credentials are valid.
   * @throws UnauthorizedException if credentials are invalid.
   */
  async validateUser(email: string, pass: string): Promise<FullUserWithRoles> {
    const user = await this.userService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials. Please check your email and password.');
  }

  /**
   * Handles the login process after a user has been validated.
   * Generates tokens and creates/updates a user session.
   * @param user The validated user object.
   * @returns An object containing the access_token and refresh_token.
   */
  async login(user: FullUserWithRoles) {
    const tokens = await this.getTokens(user);
    await this.updateUserSession(user.user_id, tokens.refresh_token);
    return tokens;
  }

  /**
   * Logs a user out by deleting their session from the database.
   * @param userId The ID of the user to log out.
   */
  async logout(userId: number) {
    await this.db.delete(schema.userSessionTable)
      .where(eq(schema.userSessionTable.user_id, userId));
    return { message: 'Logged out successfully' };
  }

  /**
   * Refreshes authentication tokens using a valid refresh token.
   * @param userId The user ID from the refresh token payload.
   * @param rt The raw refresh token string from the client's cookie.
   * @returns A new set of access and refresh tokens.
   */
  async refreshTokens(userId: number, rt: string) {
    const user = await this.userService.findOne(userId);
    if (!user) throw new UnauthorizedException('Access Denied: User not found.');

    const session = await this.db.query.userSessionTable.findFirst({ where: eq(schema.userSessionTable.user_id, userId) });
    if (!session || !session.token) throw new UnauthorizedException('Access Denied: No active session found.');
    if (rt !== session.token) throw new UnauthorizedException('Access Denied: Invalid refresh token.');
    
    const fullUser = await this.userService.findOneByEmail(user.email);
    if (!fullUser) {
        throw new InternalServerErrorException('Could not refresh token for a non-existent user.');
    }
    
    const tokens = await this.getTokens(fullUser);
    await this.updateUserSession(user.user_id, tokens.refresh_token);
    return tokens;
  }

  /**
   * Initiates the password reset process by generating a token and sending an email.
   * @param email The email of the user requesting a password reset.
   */
  async requestPasswordReset(email: string) {
    const user = await this.userService.findOneByEmail(email);
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = addMinutes(new Date(), 30);

    await this.db.insert(schema.passwordResetTokenTable)
      .values({ user_id: user.user_id, token, expires_at })
      .onConflictDoUpdate({ target: schema.passwordResetTokenTable.user_id, set: { token, expires_at } });
    
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/password-reset?token=${token}`;
    await this.mailService.sendPasswordResetEmail(user, resetUrl);
    
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }
  
  /**
   * Completes the password reset process using a valid token.
   * @param token The password reset token from the email link.
   * @param newPassword The new password to set for the user.
   */
  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await this.db.query.passwordResetTokenTable.findFirst({ where: and(eq(schema.passwordResetTokenTable.token, token), gt(schema.passwordResetTokenTable.expires_at, new Date())) });
    if (!resetRecord) throw new BadRequestException('Invalid or expired password reset token.');
    
    const saltRounds = parseInt(this.configService.get<string>('PASSWORD_SALT_ROUNDS', '10'));
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    await this.db.transaction(async (tx) => {
        await tx.update(schema.userTable).set({ password: hashedPassword, updated_at: new Date() }).where(eq(schema.userTable.user_id, resetRecord.user_id));
        await tx.update(schema.passwordResetTokenTable).set({ expires_at: new Date() }).where(eq(schema.passwordResetTokenTable.id, resetRecord.id));
    });
    return { message: 'Password has been reset successfully.' };
  }

  /**
   * Private helper to create or update a user's session with a new refresh token.
   */
  private async updateUserSession(userId: number, refreshToken: string) {
    const refreshExpiryDays = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME', '7d').replace('d', ''));
    const expires_at = addDays(new Date(), refreshExpiryDays);
    await this.db.insert(schema.userSessionTable).values({ user_id: userId, token: refreshToken, expires_at }).onConflictDoUpdate({ target: schema.userSessionTable.user_id, set: { token: refreshToken, expires_at } });
  }

  /**
   * Private helper to generate new access and refresh tokens for a user.
   * This is where the JWT secrets are used.
   */
  private async getTokens(user: FullUserWithRoles) {
    const payload = { 
      sub: user.user_id, 
      email: user.email, 
      school_id: user.school_id, 
      roles: user.roles 
    };
    
    const accessSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { 
        secret: accessSecret, 
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION_TIME', '15m') 
      }),
      this.jwtService.signAsync({ sub: user.user_id }, { 
        secret: refreshSecret, 
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME', '7d') 
      }),
    ]);
    return { access_token: accessToken, refresh_token: refreshToken };
  }
}