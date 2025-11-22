import { Injectable, Inject, LoggerService as NestLoggerService } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

interface LogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  [key: string]: any;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Write a log message (general)
   */
  log(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.info(message, { context, ...metadata });
  }

  /**
   * Write an error message
   */
  error(message: string, trace?: string, context?: string, metadata?: Record<string, any>) {
    this.logger.error(message, { context, trace, ...metadata });
  }

  /**
   * Write a warning message
   */
  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.warn(message, { context, ...metadata });
  }

  /**
   * Write a debug message
   */
  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.debug(message, { context, ...metadata });
  }

  /**
   * Write a verbose message
   */
  verbose(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.verbose(message, { context, ...metadata });
  }

  /**
   * Log HTTP request
   */
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    context?: LogContext,
  ) {
    this.logger.info('HTTP Request', {
      context: 'HTTP',
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      ...context,
    });
  }

  /**
   * Log HTTP error
   */
  logHttpError(
    method: string,
    url: string,
    statusCode: number,
    error: Error,
    context?: LogContext,
  ) {
    this.logger.error('HTTP Error', {
      context: 'HTTP',
      method,
      url,
      statusCode,
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }

  /**
   * Log database query
   */
  logDatabaseQuery(
    query: string,
    parameters: any[],
    executionTime: number,
    context?: string,
  ) {
    this.logger.debug('Database Query', {
      context: context || 'Database',
      query,
      parameters,
      executionTime: `${executionTime}ms`,
    });
  }

  /**
   * Log database error
   */
  logDatabaseError(query: string, error: Error, context?: string) {
    this.logger.error('Database Error', {
      context: context || 'Database',
      query,
      error: error.message,
      stack: error.stack,
    });
  }

  /**
   * Log cache operation
   */
  logCacheOperation(
    operation: 'get' | 'set' | 'del' | 'hit' | 'miss',
    key: string,
    metadata?: Record<string, any>,
  ) {
    this.logger.debug('Cache Operation', {
      context: 'Cache',
      operation,
      key,
      ...metadata,
    });
  }

  /**
   * Log external API call
   */
  logExternalApiCall(
    service: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    metadata?: Record<string, any>,
  ) {
    this.logger.info('External API Call', {
      context: 'ExternalAPI',
      service,
      endpoint,
      method,
      statusCode,
      responseTime: `${responseTime}ms`,
      ...metadata,
    });
  }

  /**
   * Log external API error
   */
  logExternalApiError(
    service: string,
    endpoint: string,
    error: Error,
    metadata?: Record<string, any>,
  ) {
    this.logger.error('External API Error', {
      context: 'ExternalAPI',
      service,
      endpoint,
      error: error.message,
      stack: error.stack,
      ...metadata,
    });
  }

  /**
   * Log business operation
   */
  logBusinessOperation(
    operation: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>,
  ) {
    this.logger.info('Business Operation', {
      context: 'Business',
      operation,
      entityType,
      entityId,
      ...metadata,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>,
  ) {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';

    this.logger[level]('Security Event', {
      context: 'Security',
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log audit trail (for compliance)
   */
  logAudit(
    action: string,
    entityType: string,
    entityId: string,
    userId?: string,
    metadata?: Record<string, any>,
  ) {
    this.logger.warn('Audit Trail', {
      context: 'Audit',
      action,
      entityType,
      entityId,
      userId,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>,
  ) {
    const level = duration > 1000 ? 'warn' : 'debug';

    this.logger[level]('Performance Metric', {
      context: 'Performance',
      operation,
      duration: `${duration}ms`,
      ...metadata,
    });
  }

  /**
   * Log scheduled task execution
   */
  logScheduledTask(
    taskName: string,
    status: 'started' | 'completed' | 'failed',
    metadata?: Record<string, any>,
  ) {
    const level = status === 'failed' ? 'error' : 'info';

    this.logger[level]('Scheduled Task', {
      context: 'Scheduler',
      taskName,
      status,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log validation error
   */
  logValidationError(
    field: string,
    value: any,
    constraints: string[],
    metadata?: Record<string, any>,
  ) {
    this.logger.warn('Validation Error', {
      context: 'Validation',
      field,
      value,
      constraints,
      ...metadata,
    });
  }
}
