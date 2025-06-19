import { SetMetadata } from '@nestjs/common';
import { schoolRoleEnum } from '../../drizzle/schema';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (typeof schoolRoleEnum.enumValues)[number][]) =>
  SetMetadata(ROLES_KEY, roles);