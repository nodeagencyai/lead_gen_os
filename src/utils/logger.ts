/**
 * Production-safe logger utility
 * Only logs in development mode
 */

const isDevelopment = import.meta.env.DEV;

type LoggerMethod = (...args: unknown[]) => void;

export const logger: Record<'log' | 'error' | 'warn' | 'info' | 'debug', LoggerMethod> = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

export default logger;