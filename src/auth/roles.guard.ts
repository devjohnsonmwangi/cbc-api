// src/auth/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { schoolRoleEnum } from '../drizzle/schema';

/**
 * A NestJS guard that protects endpoints by checking user roles.
 * It reads role metadata set by the `@Roles()` decorator.
 * This guard is specifically designed to handle a nested role structure
 * within the JWT payload, such as: user.roles = [{ role: { role_name: 'some_role' } }]
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determines if the current user has permission to activate the route.
   * @param context The execution context of the current request.
   * @returns A boolean indicating whether access is granted.
   */
  canActivate(context: ExecutionContext): boolean {
    // 1. Get the roles required to access the endpoint from the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If no roles are required for this endpoint, grant access immediately.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. Get the user object from the request (attached by a preceding AuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // 3. Perform safety checks (CRITICAL for production)
    // If there is no user or the user.roles property is not an array, deny access.
    if (!user || !Array.isArray(user.roles)) {
      return false;
    }

    // 4. Extract the user's role names into a simple, efficient format (a Set)
    // This safely navigates the complex object: { role: { role_name: '...' } }
    const userRoleNames = new Set<string>();
    for (const roleObject of user.roles) {
      // Safely access the nested role name and add it to the set if it exists.
      const roleName = roleObject?.role?.role_name;
      if (roleName) {
        userRoleNames.add(roleName);
      }
    }

    // 5. Check if the user has at least one of the required roles.
    // The .some() method stops and returns true on the first match.
    return requiredRoles.some((requiredRole) => userRoleNames.has(requiredRole));
  }
}