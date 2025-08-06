import { PartialType } from '@nestjs/mapped-types';
import { CreateTermDto } from './create-term.dto';

//  using PartialType for clean and maintainable update DTOs.
export class UpdateTermDto extends PartialType(CreateTermDto) {}