// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // Use NestJS's built-in logger for more structured bootstrap logging
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // --- 1. Get Config Service for Environment Variables ---
  // This allows us to safely access environment variables like PORT
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // --- 2. Enable CORS (Cross-Origin Resource Sharing) ---
  // Essential for allowing your frontend (e.g., React on a different domain) to communicate with the API
  app.enableCors({
    origin: '*', // IMPORTANT: For production, restrict this to your frontend's domain: 'https://yourschoolapp.com'
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // --- 3. Set a Global API Prefix ---
  // Best practice for versioning your API (e.g., /api/v1)
  app.setGlobalPrefix('api/v1');

  // --- 4. Apply Global Validation Pipe ---
  // This automatically validates all incoming request bodies against their DTOs (Data Transfer Objects)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips any properties from the request body that are not in the DTO
      transform: true, // Automatically transforms incoming payloads to DTO instances
      forbidNonWhitelisted: true, // Throws an error if unknown properties are sent
    }),
  );

  // --- 5. Enable Graceful Shutdown Hooks ---
  // Ensures the app shuts down gracefully (e.g., closes database connections) on process signals (like Ctrl+C)
  app.enableShutdownHooks();

  // --- 6. Setup Swagger for API Documentation ---
  // Creates an interactive API documentation page, invaluable for development and testing
  const swaggerConfig = new DocumentBuilder()
    .setTitle('School Management System API')
    .setDescription('The official API documentation for the CBC School Management System.')
    .setVersion('1.0')
    .addBearerAuth() // Adds authorization input for JWTs
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document); // The docs will be available at /docs

  // --- Start the Application ---
  await app.listen(port);
  
  // Log the application URLs for convenience
  logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger documentation is available at: http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  // Catch any unhandled errors during the bootstrap process
  const logger = new Logger('Bootstrap');
  logger.error('❌ Fatal error during application startup:', err);
  process.exit(1);
});