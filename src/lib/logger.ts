import * as Sentry from '@sentry/nextjs';

const isDevelopment = process.env.NODE_ENV === 'development';
const sentryEnabled = Boolean(process.env.SENTRY_DSN) && process.env.NODE_ENV === 'production';

if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.exception) {
        console.error('[SENTRY] Error captured:', event.exception);
      }
      return event;
    },
    integrations: (integrations) => {
      return integrations.filter((integration) => {
        const prismaIntegrationNames = ['Prisma', '@prisma/instrumentation'];
        if (prismaIntegrationNames.some(name => integration.name === name)) {
          return false;
        }
        return true;
      });
    },
    ignoreErrors: [
      /Critical dependency: the request of a dependency is an expression/,
      /@prisma\/instrumentation/,
    ],
  });
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export const logger = {
  error: (message: string, error?: unknown, context?: LogContext) => {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, { error, context });
    }

    if (sentryEnabled) {
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        extra: { message, ...context },
      });
    }
  },

  warn: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, context);
    }

    if (sentryEnabled) {
      Sentry.captureMessage(message, 'warning');
    }
  },

  info: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, context);
    }

    if (sentryEnabled) {
      Sentry.addBreadcrumb({
        message,
        data: context,
        level: 'info',
      });
    }
  },

  debug: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, context);
    }
  },

  performance: (name: string, durationMs: number, context?: LogContext) => {
    if (isDevelopment) {
      console.log(`[PERF] ${name}: ${durationMs}ms`, context);
    }
  },
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (sentryEnabled) {
    Sentry.captureMessage(message, level);
  }
};

export const captureException = (error: Error, context?: LogContext) => {
  if (sentryEnabled) {
    Sentry.captureException(error, { extra: context });
  }
  logger.error('Exception captured', error, context);
};
