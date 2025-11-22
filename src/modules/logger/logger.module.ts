import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LoggerService } from './logger.service';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const logLevel = configService.get('LOG_LEVEL', 'info');
        const nodeEnv = configService.get('NODE_ENV', 'development');

        // Console transport format
        const consoleFormat = winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
            let log = `${timestamp} [${context || 'Application'}] ${level}: ${message}`;

            if (Object.keys(meta).length > 0) {
              log += ` ${JSON.stringify(meta)}`;
            }

            if (trace) {
              log += `\n${trace}`;
            }

            return log;
          }),
        );

        // File transport format (JSON for easier parsing)
        const fileFormat = winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        );

        // Transport configurations
        const transports: winston.transport[] = [];

        // Console transport (always enabled)
        transports.push(
          new winston.transports.Console({
            format: consoleFormat,
          }),
        );

        // File transports (only in production or when explicitly enabled)
        if (nodeEnv === 'production' || configService.get('ENABLE_FILE_LOGGING') === 'true') {
          // Combined log file (all levels)
          transports.push(
            new DailyRotateFile({
              filename: 'logs/combined-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '20m',
              maxFiles: '14d',
              format: fileFormat,
              level: logLevel,
            }),
          );

          // Error log file (only errors)
          transports.push(
            new DailyRotateFile({
              filename: 'logs/error-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '20m',
              maxFiles: '30d',
              format: fileFormat,
              level: 'error',
            }),
          );

          // Application-specific logs
          transports.push(
            new DailyRotateFile({
              filename: 'logs/app-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '20m',
              maxFiles: '14d',
              format: fileFormat,
              level: 'info',
            }),
          );

          // Audit log for critical operations
          transports.push(
            new DailyRotateFile({
              filename: 'logs/audit-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '20m',
              maxFiles: '90d',
              format: fileFormat,
              level: 'warn',
            }),
          );
        }

        return {
          level: logLevel,
          transports,
          exceptionHandlers: [
            new winston.transports.File({ filename: 'logs/exceptions.log' }),
          ],
          rejectionHandlers: [
            new winston.transports.File({ filename: 'logs/rejections.log' }),
          ],
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
