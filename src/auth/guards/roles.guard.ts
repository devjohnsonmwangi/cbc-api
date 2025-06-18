import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/public.decorator';
import { schoolRoleEnum } from '../../drizzle/schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      (typeof schoolRoleEnum.enumValues)[number][]
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    // If no @Roles decorator is used, the route is public to authenticated users
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.roles) {
      throw new ForbiddenException('User roles not found in token payload.');
    }

    const userRoles: string[] = user.roles.map((r: { role: string }) => r.role);

    // The core logic for Super Admin: if 'super_admin' is a role, always allow access.
    if (userRoles.includes('super_admin')) {
      return true;
    }

    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRequiredRole) {
        throw new ForbiddenException('You do not have the required permissions to access this resource.');
    }
    
    return true;
  }
}