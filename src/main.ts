import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
