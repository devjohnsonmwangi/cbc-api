// drizzle.config.ts

import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in the .env file');
}

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./src/drizzle/migrations",
  dialect: 'postgresql', // Explicitly setting the dialect
  dbCredentials: {
    url: process.env.DATABASE_URL, // Use 'url' which is expected for postgresql dialect
  },
  verbose: true,
  strict: true,
});