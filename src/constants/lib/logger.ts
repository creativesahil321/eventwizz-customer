/**
 * Production-safe logging utility
 * Only logs in development, errors always logged
 */

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  /**
   * Info logs - only in development
   */
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  },

  /**
   * Warning logs - always shown
   */
  warn: (message: string, ...args: any[]) => {
    console.warn(message, ...args);
  },

  /**
   * Error logs - always shown
   * TODO: Integrate with error tracking service (Sentry, etc.)
   */
  error: (message: string, error?: any) => {
    console.error(message, error);
    // Future: Send to error tracking service
    // Sentry.captureException(error, { extra: { message } });
  },

  /**
   * Debug logs - only in development
   */
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.debug(message, ...args);
    }
  },
};
