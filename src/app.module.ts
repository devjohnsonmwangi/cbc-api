// src/app.module.ts

// --- NestJS Core & Platform ---
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

// --- Infrastructure & Core Modules ---
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';
import helmet from 'helmet'; 
import type { RedisClientOptions } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import * as Joi from 'joi';

// --- Custom Core Modules ---
import { DrizzleModule } from './drizzle/drizzle.module';
import { HealthModule } from './health/health.module';

// --- Guards & Authentication ---
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

// --- DOMAIN MODULES (Organized by function) ---
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ConfigurationsModule } from './configurations/configurations.module';
import { SecurityModule } from './security/security.module';
import { SchoolsModule } from './schools/schools.module';
import { UsersModule } from './users/users.module';
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
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EventsModule } from './events/events.module';
import { DocumentsModule } from './documents/documents.module';
import { SupportTicketsModule } from './support-tickets/support-tickets.module';


@Module({
  imports: [
    // =========================================================================
    // --- CORE INFRASTRUCTURE (The "Engine Room") ---
    // =========================================================================
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
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
    
    // --- DOMAIN: Platform & SaaS Billing ---
    PlansModule,
    SubscriptionsModule,
    ConfigurationsModule,

    // --- DOMAIN: Core Security & Identity ---
    AuthModule,
    SecurityModule, 

    // --- DOMAIN: Organizational Structure ---
    SchoolsModule,
    UsersModule,
    DepartmentsModule,
    PositionsModule,
    
    // --- DOMAIN: Student & Community ---
    StudentsModule,
    ConsentsModule,
    DisciplineModule,
    GroupsModule, 
    StudentLeadershipModule,

    // --- DOMAIN: Academic Core ---
    AcademicYearsModule,
    TermsModule,
    ClassesModule,
    SubjectsModule,
    EnrollmentsModule,
    AssignmentsModule,
    AssessmentsModule,
    
    // --- DOMAIN: Learning Management System (LMS) ---
    LmsModule,
    
    // --- DOMAIN: School-Level Finance ---
    FinanceModule,
    PaymentsModule,
    
    // --- DOMAIN: Operations & Governance ---
    GovernanceModule, 
    MeetingsModule,
    VenuesModule,
    TimetablesModule,

    // --- DOMAIN: Communication & Support ---
    ChatModule,
    NotificationsModule,
    EventsModule,
    DocumentsModule,
    SupportTicketsModule,
  ],
  providers: [
    // Apply Guards Globally for a "secure-by-default" posture
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  controllers: [],
})
// Implement NestModule to apply middleware like Helmet
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the helmet middleware to all routes for setting security-related HTTP headers
    // The syntax '*' is deprecated. Use '/*' to apply middleware to all routes.
    consumer.apply(helmet()).forRoutes({ path: '/*', method: RequestMethod.ALL });
  }
}