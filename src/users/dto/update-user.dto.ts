import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Users cannot update their password, email, or school_id via this general update endpoint.
// Password changes should go through the dedicated reset flow.
// Email changes should be a separate, verified process.
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'email', 'school_id'] as const),
) {}