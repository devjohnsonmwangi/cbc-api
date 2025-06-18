// src/auth/auth.service.ts

import { Injectable, UnauthorizedException, Inject, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { eq, and, gt } from 'drizzle-orm';
import { addDays, addMinutes } from 'date-fns';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import * as schema from '../drizzle/schema';
// If the correct type is 'NewUser', update the import as follows:
import { TUserSelect, TNewUser } from '../drizzle/schema';
// And update all usages of 'TNewUser' to 'NewUser' below.

// If you need to define and export TNewUser, add this to '../drizzle/schema.ts':
// export type TNewUser = { /* define the shape here */ };
import { UserService } from '../users/users.service';
import { MailService } from '../mailer/mailer.service'; // 👈 1. Corrected import path

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService, // 👈 2. Injected the correct MailService
  ) {}

  // --- NEW REGISTER METHOD ---
  /**
   * Registers a new user, creates an email verification token, and sends a welcome email.
   * @param createUserDto - Data for the new user (e.g., email, password, full_name).
   */
  async register(createUserDto: TNewUser) {
    const existingUser = await this.userService.findOneByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    // Create the new user using the UserService
    // For registration, the creator is the user themselves, so default to ['user'] or adjust as needed
    const newUser = await this.userService.create(
      { 
        ...createUserDto, 
        roles: ['student'],
        phone_number: createUserDto.phone_number === null ? undefined : createUserDto.phone_number,
        school_id: createUserDto.school_id === null ? undefined : createUserDto.school_id
      },
      ['user']
    );

    // --- Send Welcome & Verification Email ---
    // In a real app, you would create and store a verification token.
    const verificationToken = crypto.randomBytes(32).toString('hex');
    // Example: await this.db.insert(schema.emailVerificationTable).values({ userId: newUser.id, token: verificationToken, ... });

    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`;
    
    await this.mailService.sendWelcomeEmail(
      newUser.email,
      newUser.full_name,
      verificationUrl,
    );

    // Return the new user (without the password)
    const { password, ...userResult } = newUser;
    return userResult;
  }
  
  // --- UPDATED PASSWORD RESET METHOD ---
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
      .onConflictDoUpdate({ 
          target: schema.passwordResetTokenTable.user_id, 
          set: { token, expires_at }
      });
    
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/password-reset?token=${token}`;
    
    // 👈 3. Updated to call the new MailService method with the correct arguments
    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.full_name, // Pass the user's name for personalization
      resetUrl
    );
    
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }
  
  // --- ALL OTHER METHODS REMAIN THE SAME ---
  // ... (validateUser, login, logout, refreshTokens, resetPassword, etc.)

  async validateUser(email: string, pass: string): Promise<TUserSelect & { roles: { role: string; }[] }> {
    const user = await this.userService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials. Please check your email and password.');
  }

  async login(user: TUserSelect & { roles: { role: string; }[] }) {
    const tokens = await this.getTokens(user);
    await this.updateUserSession(user.user_id, tokens.refresh_token);
    return tokens;
  }

  async logout(userId: number) {
    await this.db.update(schema.userSessionTable)
      .set({ token: undefined, expires_at: new Date() })
      .where(eq(schema.userSessionTable.user_id, userId));
    return { message: 'Logged out successfully' };
  }

  async refreshTokens(userId: number, rt: string) {
    const user = await this.userService.findOne(userId);
    if (!user) throw new UnauthorizedException('Access Denied: User not found.');
    const session = await this.db.query.userSessionTable.findFirst({ where: eq(schema.userSessionTable.user_id, userId) });
    if (!session || !session.token) throw new UnauthorizedException('Access Denied: No active session found.');
    if (rt !== session.token) throw new UnauthorizedException('Access Denied: Invalid refresh token.');
    const fullUser = await this.userService.findOneByEmail(user.email);
    const tokens = await this.getTokens(fullUser);
    await this.updateUserSession(user.user_id, tokens.refresh_token);
    return tokens;
  }
  
  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await this.db.query.passwordResetTokenTable.findFirst({ where: and(eq(schema.passwordResetTokenTable.token, token), gt(schema.passwordResetTokenTable.expires_at, new Date())) });
    if (!resetRecord) throw new BadRequestException('Invalid or expired password reset token.');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.db.transaction(async (tx) => {
        await tx.update(schema.userTable).set({ password: hashedPassword, updated_at: new Date() }).where(eq(schema.userTable.user_id, resetRecord.user_id));
        await tx.update(schema.passwordResetTokenTable).set({ expires_at: new Date() }).where(eq(schema.passwordResetTokenTable.id, resetRecord.id));
    });
    return { message: 'Password has been reset successfully.' };
  }

  private async updateUserSession(userId: number, refreshToken: string) {
    const refreshExpiryDays = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME', '7d').replace('d', ''));
    const expires_at = addDays(new Date(), refreshExpiryDays);
    await this.db.insert(schema.userSessionTable).values({ user_id: userId, token: refreshToken, expires_at }).onConflictDoUpdate({ target: schema.userSessionTable.user_id, set: { token: refreshToken, expires_at } });
  }

  private async getTokens(user: TUserSelect & { roles: { role: string; }[] }) {
    const payload = { sub: user.user_id, email: user.email, school_id: user.school_id, roles: user.roles };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: this.configService.get<string>('JWT_ACCESS_SECRET'), expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION_TIME', '15m') }),
      this.jwtService.signAsync({ sub: user.user_id }, { secret: this.configService.get<string>('JWT_REFRESH_SECRET'), expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME', '7d') }),
    ]);
    return { access_token: accessToken, refresh_token: refreshToken };
  }
}