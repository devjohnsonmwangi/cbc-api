// src/auth/auth.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UserService } from '../users/users.service'; // Corrected from UserModule
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/access-token.guard.ts';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * The AuthModule is responsible for handling all authentication and authorization logic.
 * It is marked as @Global() to make its providers, especially JwtService, available
 * throughout the entire application without needing to import AuthModule everywhere.
 * This is crucial for guards that might be used in other modules.
 */
@Global() // 👈 1. Make this module global
@Module({
  imports: [
    PassportModule, // Standard module for authentication strategies
    // 👈 2. Configure JwtModule asynchronously to use ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule], // Make ConfigService available inside this module
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        // Use your secrets from the .env file
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION_TIME'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService, // 👈 3. Provide UserService directly
    AuthGuard,
    RefreshTokenGuard,
    RolesGuard,
  ],
  // 👈 4. Export services and modules for use in other parts of the app
  exports: [AuthService, JwtModule],
})
export class AuthModule {}