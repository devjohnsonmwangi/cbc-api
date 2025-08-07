// src/app.module.ts
// This module is the root of the application, importing all necessary modules
// and configuring global settings like guards, middleware, and providers.
//developed  and   designed by  Eng johnson Mwangi via  JOMULT initiative 
// (https://jomult.com) for the CBC School Management System.
// It includes domain modules for business logic and infrastructure modules for core functionalities.


// --- All your existing imports are correct ---
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';
import helmet from 'helmet';
import type { RedisClientOptions } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import Joi from 'joi';

// --- Domain and infrastructure modules ---
import { DrizzleModule } from './drizzle/drizzle.module';
import { HealthModule } from './health/health.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ConfigurationsModule } from './configurations/configurations.module';
import { AuthModule } from './auth/auth.module';
import { SecurityModule } from './security/security.module';
import { SchoolModule } from './schools/schools.module';
import { UserModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { PositionsModule } from './positions/positions.module';
import { StudentsModule } from './students/students.module';
import { ConsentsModule } from './consents/consents.module';
import { DisciplineModule } from './discipline/discipline.module';
import { GroupsModule } from './groups/groups.module';
import { StudentLeadershipModule } from './student-leadership/student-leadership.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { TermsModule } from './terms/terms.module';
import { ClassesModule } from './classes/classes.module';
import { SubjectsModule } from './subjects/subjects.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { LmsModule } from './lms/lms.module';
import { FinanceModule } from './finance/finance.module';
import { PaymentsModule } from './payments/payments.module';
import { GovernanceModule } from './governance/governance.module';
import { MeetingsModule } from './meetings/meetings.module';
import { VenuesModule } from './venues/venues.module';
import { TimetablesModule } from './timetables/timetables.module';
import { MailModule } from './mailer/mailer.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EventsModule } from './events/events.module';
import { DocumentsModule } from './documents/documents.module';
import { SupportTicketsModule } from './support-tickets/support-tickets.module';
import { TeacherAssignmentsModule } from './teacher-assignments/teacher-assignments.module';
import { StudentEnrollmentsModule } from './student-enrollment/student-enrollment.module';
import { TimetableSlotsModule } from './timetable-slots/timetable-slots.module';
import { TeacherPreferencesModule } from './teacher-preferences/teacher-preferences.module';
import { SubjectRequirementsModule } from './subject-requirements/subject-requirements.module';
import { CoursesModule } from './courses/courses.module';
import { CourseModulesModule } from './course-modules/course-modules.module';
import { LessonContentsModule } from './lesson-contents/lesson-contents.module';

// --- Guards ---
import { AuthGuard } from './auth/guards/access-token.guard';

@Module({
  imports: [
    // =========================================================================
    // --- CORE INFRASTRUCTURE ---
    // =========================================================================
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        // Application
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3001),
        FRONTEND_URL: Joi.string().required(),

        // Database
        DATABASE_URL: Joi.string().required(),

        // JWT Authentication
        JWT_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRATION_TIME: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRATION_TIME: Joi.string().default('7d'),

        // Email (Nodemailer)
        MAIL_HOST: Joi.string().required(),
        MAIL_PORT: Joi.number().required(),
        MAIL_USER: Joi.string().required(),
        MAIL_PASS: Joi.string().required(),
        MAIL_FROM: Joi.string().required(),

        // Caching (Redis)
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),

        // Security
        PASSWORD_SALT_ROUNDS: Joi.number().default(10),
      }),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('NODE_ENV') !== 'production' ? 'debug' : 'info',
          transport: config.get('NODE_ENV') !== 'production' ? { target: 'pino-pretty' } : undefined,
        },
      }),
    }),
    DrizzleModule,
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT'),
        ttl: 60 * 5, // Cache TTL of 5 minutes
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    TerminusModule,
    HealthModule,
    EventEmitterModule.forRoot(),

    // =========================================================================
    // --- DOMAIN MODULES (The "Business Logic") ---
    // =========================================================================
    PlansModule,
    SubscriptionsModule,
    ConfigurationsModule,
    AuthModule,
    SecurityModule,
    SchoolModule,
    UserModule,
    DepartmentsModule,
    PositionsModule,
    StudentsModule,
    ConsentsModule,
    DisciplineModule,
    GroupsModule,
    StudentLeadershipModule,
    AcademicYearsModule,
    TermsModule,
    ClassesModule,
    SubjectsModule,
    EnrollmentsModule,
    AssignmentsModule,
    AssessmentsModule,
    LmsModule,
    FinanceModule,
    PaymentsModule,
    GovernanceModule,
    MeetingsModule,
    VenuesModule,
    TimetablesModule,
    MailModule,
    ChatModule,
    NotificationsModule,
    EventsModule,
    DocumentsModule,
    SupportTicketsModule,
    TeacherAssignmentsModule,
    StudentEnrollmentsModule,
    //timetable slots module
    TimetableSlotsModule,
    // Teacher Preferences Module
    TeacherPreferencesModule,
    //subject requirements module
    SubjectRequirementsModule,
    //courses module
    CoursesModule,
    //course modules module
    CourseModulesModule,
    //lesson contents module
    LessonContentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  controllers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // UPDATED: Changed '/*' to '*' to use modern, compliant syntax for all routes.
    consumer.apply(helmet()).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}