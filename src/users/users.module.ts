import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { SchoolModule } from '../schools/schools.module'; // Import SchoolModule

/**
 * The UserModule is responsible for all user-related functionalities.
 * It imports the SchoolModule to make the SchoolService available for dependency injection,
 * which is necessary for validating that a user is being created for an existing school.
 */
@Module({
  imports: [
    // Importing SchoolModule makes any exported providers from it,
    // like SchoolService, available for injection within this module.
    SchoolModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  // We export UserService so that it can be used by other modules,
  // most importantly the AuthModule for user validation during login.
  exports: [UserService],
})
export class UserModule {}