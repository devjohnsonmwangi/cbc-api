// developed    with  NestJS, TypeScript, and Drizzle ORM
// developed  by   senior  developer   Eng Johnson Mwangi
// this   code  is  part  of  a  school management system API
// this   code  is  for  managing official school-wide announcements
// any  issues  or   bugs  should    be  reported  to   the   developer  team:  senior developer Eng Johnson Mwangi
// my   email: johnsonthuraniramwangi@gmail.com
// or our   developer  team email: jomulimited2@gmail.com

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { DrizzleModule } from '../../drizzle/drizzle.module';

/**
 * The AnnouncementsModule encapsulates all logic related to the announcements feature.
 * It imports necessary modules like DrizzleModule for database access and BullModule
 * to register and inject the job queue used for background processing.
 * By bundling the controller and service, it creates a self-contained, reusable,
 * and maintainable vertical slice of the application.
 */
@Module({
  imports: [
    // Makes the Drizzle ORM provider available for injection into the AnnouncementsService.
    DrizzleModule,
    
    // Registers the 'communication-jobs' queue. This allows the AnnouncementsService
    // to inject this specific queue using the @InjectQueue('communication-jobs') decorator.
    BullModule.registerQueue({
      name: 'communication-jobs',
    }),
  ],
  // The controller that handles all incoming HTTP requests for the /announcements route.
  controllers: [AnnouncementsController],
  // The service that contains the core business logic for the announcements feature.
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}