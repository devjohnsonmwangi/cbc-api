import { IsInt, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { enrollmentStatusEnum } from '../../drizzle/schema';

// We create a specific Update DTO because student_id and academic_year_id should never be changed on an enrollment.
// Only the class (for a transfer) or the status can be updated.
export class UpdateEnrollmentDto {
    @ApiProperty({ 
        description: 'The new class ID for a mid-year transfer.', 
        example: 5,
        required: false 
    })
    @IsInt()
    @IsOptional()
    class_id?: number;

    @ApiProperty({
        description: 'The new status of the enrollment.',
        enum: enrollmentStatusEnum.enumValues,
        example: 'withdrawn',
        required: false,
    })
    @IsEnum(enrollmentStatusEnum.enumValues)
    @IsOptional()
    status?: typeof enrollmentStatusEnum.enumValues[number];
}