import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { BadRequestException, ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const logger = new Logger('Bootstrap');
  const validationLogger = new Logger('ValidationPipe');

  // Ensure Prisma disconnects on shutdown so connections are released
  app.enableShutdownHooks();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS: allow dev (localhost:3000) and production frontend(s) from env
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [process.env.FRONTEND_URL || 'http://localhost:3000'].filter(Boolean);
  /** Local dev defaults; production frontends must be listed in CORS_ORIGINS or FRONTEND_URL. */
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
  ];
  const origins = [...new Set([...defaultOrigins, ...corsOrigins])];
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global validation pipe with better error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: false,
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) =>
          e.constraints ? Object.values(e.constraints) : [],
        );
        if (messages.length) {
          validationLogger.warn(messages.join(' | '));
        }
        return new BadRequestException(messages.length ? messages : errors);
      },
    }),
  );

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  const port = process.env.PORT || 2000;
  await app.listen(port);
  
  logger.log(`🚀 Backend server running on http://localhost:${port}`);
  logger.log(`📚 API Documentation available at http://localhost:${port}/api`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
