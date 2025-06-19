import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Custom decorator to mark a route as public.
 * This is used by the global AuthGuard to bypass JWT authentication for specific endpoints
 * like login, register, and password reset.
 *
 * @example
 * @Public()
 * @Post('login')
 * loginUser() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);