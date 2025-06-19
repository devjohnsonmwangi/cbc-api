import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Define a type for our JWT payload for consistency
export interface JwtPayload {
  sub: number;
  email: string;
  school_id: number | null;
  roles: { role: string }[];
}

/**
 * Custom decorator to extract the user payload from the request object.
 * The payload is attached to the request by the AuthGuard.
 * This provides a clean, type-safe way to access user data in controllers.
 * 
 * @example
 * @Get('profile')
 * getProfile(@GetUser() user: JwtPayload) {
 *   return user;
 * }
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);