import { Module, Global } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';

// --- CORRECT, MODERN IMPORTS ---
import { drizzle } from 'drizzle-orm/neon-serverless'; 
import { Pool } from '@neondatabase/serverless'; // Pool is imported from the main package

import * as schema from './schema';
import { DRIZZLE_ORM_TOKEN } from './drizzle.constants';

@Global()
@Module({
  imports: [ConfigModule], // ConfigModule is likely already global from app.module.ts
  providers: [
    {
      provide: DRIZZLE_ORM_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');

        if (!connectionString) {
          throw new Error('DATABASE_URL environment variable is not set');
        }

        // --- CORRECT NEON WEBSOCKET (POOL) SETUP ---
        // This creates a WebSocket-based connection pool that supports transactions.
        const pool = new Pool({ connectionString });

        // The drizzle function is imported from 'drizzle-orm/neon-serverless'
        return drizzle(pool, { schema, logger: true });
      },
    },
  ],
  exports: [DRIZZLE_ORM_TOKEN],
})
export class DrizzleModule {}

// This type definition remains correct
export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;