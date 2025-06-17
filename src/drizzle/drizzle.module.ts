import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/neon-http'; 
import { neon } from '@neondatabase/serverless';

import * as schema from './schema';
import { DRIZZLE_ORM_TOKEN } from './drizzle.constants';

// We use @Global() to make the provider available throughout the application
// without needing to import DrizzleModule in every feature module.
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available globally
    }),
  ],
  providers: [
    {
      provide: DRIZZLE_ORM_TOKEN,
      // We use a factory provider because the instantiation depends on ConfigService.
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');

        if (!connectionString) {
          throw new Error('DATABASE_URL environment variable is not set');
        }

        // --- NEON SPECIFIC CHANGE ---
        // Create a Neon query function
        const query = neon(connectionString);

        // Use the drizzle function with the Neon query function and your schema
        // Note: We use drizzle-orm/neon-http which is optimized for this driver
        return drizzle(query, { schema, logger: true });
      },
    },
  ],
  // Export the provider so it can be injected into other modules' services
  exports: [DRIZZLE_ORM_TOKEN],
})
export class DrizzleModule {}

// Add a type definition for our database instance for easy injection
export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;