import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { LoggerService } from './modules/logger/logger.service';
import { LoggingInterceptor } from './modules/logger/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './modules/logger/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Winston logger globally
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global logging interceptor
  const loggerService = app.get(LoggerService);
  app.useGlobalInterceptors(new LoggingInterceptor(loggerService));

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(loggerService));

  // CORS
  if (process.env.CORS_ENABLED === 'true') {
    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    });
  }

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Polish B2B Tax Handler API')
    .setDescription(
      'API for managing Polish B2B tax operations with multi-currency support and NBP exchange rates integration',
    )
    .setVersion('1.0')
    .addTag('currency', 'Currency conversion and exchange rates')
    .addTag('transactions', 'Tax transactions management')
    .addTag('vat', 'VAT calculations and reporting')
    .addTag('cit', 'CIT calculations and reporting')
    .addTag('health', 'Health checks')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
    🚀 Application is running on: http://localhost:${port}/${apiPrefix}
    📚 API Documentation: http://localhost:${port}/${apiPrefix}/docs
    🏥 Health Check: http://localhost:${port}/${apiPrefix}/health
  `);
}

bootstrap();
