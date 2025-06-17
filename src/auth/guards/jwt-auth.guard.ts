// src/auth/guards/jwt-auth.guard.ts

import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check for the @Public() decorator on the route handler
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route is public, allow access without authentication
    if (isPublic) {
      return true;
    }

    // Otherwise, proceed with the default JWT authentication logic
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // You can throw an exception based on either `info` or `err` arguments
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}