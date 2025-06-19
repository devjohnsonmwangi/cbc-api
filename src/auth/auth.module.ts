// src/auth/auth.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// --- SERVICE AND MODULE IMPORTS ---
import { SchoolModule } from 'src/schools/schools.module'; // 👈 1. Import SchoolModule
//import { SchoolService } from 'src/school/school.service'; // Import SchoolService if needed directly
import { UserService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/access-token.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  imports: [
    SchoolModule, // 👈 2. Add SchoolModule to the imports array
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION_TIME','15m'), // Default to 15 minutes if not set
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    // SchoolService is now provided by the imported SchoolModule,
    // so you don't need to list it here.
    AuthGuard,
    RefreshTokenGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}