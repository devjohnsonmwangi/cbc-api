import { 
    IsString, 
    IsNotEmpty, 
    IsInt, 
    Min, 
    Max, 
    Matches, 
    Validate, 
    ValidatorConstraint, 
    ValidatorConstraintInterface, 
    ValidationArguments 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// --- Embedded Custom Validator ---
@ValidatorConstraint({ name: 'isTimeAfter', async: false })
class IsTimeAfterConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: string, args: ValidationArguments) {
    // Get the value of the property to compare with (e.g., 'start_time')
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    // We only perform the validation if both time strings are present and validly formatted.
    // The @Matches decorator will catch format errors, so we don't need to double-validate here.
    if (!relatedValue || !propertyValue) {
      return true; // Let other validators handle missing values.
    }

    return propertyValue > relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `End time must be after ${relatedPropertyName}.`;
  }
}
// --- End of Embedded Custom Validator ---

export class CreateTimetableSlotDto {
  @ApiProperty({ description: 'The ID of the school this slot belongs to.', example: 1 })
  @IsInt() @IsNotEmpty()
  school_id: number;

  @ApiProperty({ 
    description: 'The day of the week, following ISO 8601 standard (1 = Monday, 7 = Sunday).', 
    example: 1 
  })
  @IsInt() @Min(1) @Max(7) @IsNotEmpty()
  day_of_week: number;

  @ApiProperty({ description: 'The start time of the slot in 24-hour HH:MM format.', example: '08:00' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Start time must be in HH:MM format.' })
  @IsString() @IsNotEmpty()
  start_time: string;

  @ApiProperty({ description: 'The end time of the slot in 24-hour HH:MM format.', example: '08:40' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'End time must be in HH:MM format.' })
  @IsString() @IsNotEmpty()
  // The @Validate decorator applies our embedded custom validator class.
  @Validate(IsTimeAfterConstraint, ['start_time'])
  end_time: string;
}