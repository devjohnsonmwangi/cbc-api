import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from '../../users/dto/create-user.dto';

/**
 * Data Transfer Object for user self-registration.
 *
 * This DTO inherits from the main `CreateUserDto` but explicitly omits properties
 * that a user should not be able to set for themselves during public registration,
 * such as their roles or the school they belong to. These properties will be
 * determined by the business logic in the `AuthService`.
 */
export class RegisterDto extends OmitType(CreateUserDto, [
  'roles',
  'school_id',
] as const) {}