import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { validateProductionEnv, warnIfNoOfficeIps } from './bootstrap/validate-env';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService);

  validateProductionEnv(config);

  app.set('trust proxy', 1);

  app.use('/api/metrics', (req: Request, res: Response, next: NextFunction) => {
    const metricsKey = config.get<string>('METRICS_API_KEY');
    if (metricsKey && req.headers['x-metrics-key'] !== metricsKey) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  });

  app.use(helmet());
  const frontendUrl = (config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '');
  const isProduction = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: isProduction
      ? frontendUrl
      : (origin, callback) => {
          const allowed =
            !origin ||
            origin === frontendUrl ||
            /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(
              origin,
            );
          callback(null, allowed ? origin || frontendUrl : false);
        },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TechPotli Business OS API')
      .setDescription('CRM + ERP REST API with AI, events, and observability')
      .setVersion('2.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT) || config.get<number>('PORT') || 3001;
  await app.listen(port, '0.0.0.0');

  await warnIfNoOfficeIps(app.get(PrismaService));

  const logger = app.get(Logger);
  logger.log(`TechPotli API running on http://localhost:${port}/api`);
  if (!isProduction) {
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
  logger.log(`Metrics: http://localhost:${port}/api/metrics`);
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
