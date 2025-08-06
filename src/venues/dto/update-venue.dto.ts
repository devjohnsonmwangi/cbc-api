import { PartialType } from '@nestjs/mapped-types';
import { CreateVenueDto } from './create-venue.dto';

// The school_id of a venue should not be changed.
export class UpdateVenueDto extends PartialType(CreateVenueDto) {
    school_id?: never;
}