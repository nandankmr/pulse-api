// Monitoring and error tracking setup
// This would typically integrate with services like Sentry, DataDog, or New Relic
// For now, we'll create a monitoring service that can be extended

import { logger } from '../utils/logger';

export interface ErrorContext {
  error: Error;
  request?: {
    url?: string;
    method?: string;
    userId?: string;
    userAgent?: string | undefined;
    ip?: string | undefined;
  };
  user?: {
    id?: string;
    email?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

export class MonitoringService {
  // In a real implementation, this would send to external monitoring service
  static captureException(errorContext: ErrorContext): void {
    logger.error('Monitoring: Exception captured', {
      error: errorContext.error.message,
      stack: errorContext.error.stack,
      request: errorContext.request,
      user: errorContext.user,
      tags: errorContext.tags,
      extra: errorContext.extra,
      timestamp: new Date().toISOString(),
    });

    // Here you would typically:
    // 1. Send to Sentry: Sentry.captureException(errorContext.error, { contexts: errorContext });
    // 2. Send to DataDog: DD_LOGS.logger.error('Exception occurred', errorContext);
    // 3. Send to New Relic: newrelic.noticeError(errorContext.error, errorContext);
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): void {
    logger.log(level, `Monitoring: ${message}`, {
      context,
      timestamp: new Date().toISOString(),
    });

    // Here you would typically send to monitoring service
  }

  static setUser(user: { id: string; email: string }): void {
    logger.info('Monitoring: User context set', { user });

    // Here you would set user context in monitoring service
  }

  static setTag(key: string, value: string): void {
    logger.info('Monitoring: Tag set', { key, value });

    // Here you would set tags in monitoring service
  }

  static setExtra(key: string, value: any): void {
    logger.info('Monitoring: Extra context set', { key, value });

    // Here you would set extra context in monitoring service
  }

  static addBreadcrumb(message: string, category?: string, level?: string): void {
    logger.info('Monitoring: Breadcrumb added', { message, category, level });

    // Here you would add breadcrumb to monitoring service
  }

  static startTransaction(name: string, description?: string): any {
    logger.info('Monitoring: Transaction started', { name, description });

    // Here you would start a transaction in monitoring service
    // Return transaction object that can be used to finish the transaction
    return {
      finish: () => {
        logger.info('Monitoring: Transaction finished', { name });
      },
      setStatus: (status: string) => {
        logger.info('Monitoring: Transaction status set', { name, status });
      }
    };
  }
}

// Global monitoring instance
export const monitoring = MonitoringService;
