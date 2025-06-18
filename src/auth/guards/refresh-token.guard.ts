import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// Extend Express Request interface to include 'user' property
declare module 'express' {
  interface Request {
    user?: any;
  }
}

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.refresh_token;

    if (!token) {
      throw new UnauthorizedException('Refresh token not found in cookies.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
    return true;
  }
}