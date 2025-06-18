import { IsString, IsEmail, IsNotEmpty, IsArray, IsEnum, IsOptional, IsInt, ArrayMinSize, MinLength } from 'class-validator';
import { schoolRoleEnum } from '../../drizzle/schema';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsArray()
  @IsEnum(schoolRoleEnum.enumValues, { each: true, message: 'Each role must be a valid school role' })
  @ArrayMinSize(1, { message: 'User must have at least one role' })
  roles: (typeof schoolRoleEnum.enumValues)[number][];

  @IsInt()
  @IsOptional()
  school_id?: number;
}