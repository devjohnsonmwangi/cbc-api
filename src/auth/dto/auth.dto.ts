// developed    with  NestJS and TypeScript
// developed  by   senior  developer   Eng Johnson Mwangi
// this   file defines the Data Transfer Objects (DTOs) for the Authentication module,
// including the structure of the JWT payload.
// any  issues  or   bugs  should    be  reported  to   the   developer  team:  senior developer Eng Johnson Mwangi
// my   email: johnsonthuraniramwangi@gmail.com
// or our   developer  team email: jomulimited2@gmail.com

import { Request } from 'express';

/**
 * Defines the structure of the payload that is encoded into the JWT access token.
 * This is the data that will be available on the `request.user` object after
 * the AccessTokenGuard successfully validates the token.
 */
export class JwtPayloadDto {
  /**
   * The unique identifier of the user.
   * This is the primary key from the userTable.
   * @example 101
   */
  id: number;

  /**
   * The user's primary email address.
   * @example 'admin@school.com'
   */
  email: string;

  /**
   * An array of roles assigned to the user.
   * This is critical for the RoleGuard to perform authorization checks.
   * @example ['school_admin', 'teacher']
   */
  roles: string[];

  /**
   * The unique identifier of the school the user belongs to.
   * This is essential for multi-tenancy and ensuring data isolation.
   * This can be null for system-level users like 'super_admin'.
   * @example 42
   */
  schoolId: number | null;
}

/**
 * Extends the standard Express Request interface to include a strongly-typed `user` property.
 * By using this custom request type in our controllers, we get full type safety and
 * autocompletion for the JWT payload, preventing common runtime errors.
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayloadDto;
}