import { AppError } from '~/core/errors/AppError'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  timestamp: string;
  level: LogLevel;
  [key: string]: unknown;
}

const Colors = {
  Reset: "\x1b[0m",
  Gray: "\x1b[90m",
  Blue: "\x1b[34m",
  Yellow: "\x1b[33m",
  Red: "\x1b[31m",
  Green: "\x1b[32m", // Adding green color for values
} as const;

export class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = LogLevel.DEBUG;
  private defaultContext: Record<string, unknown> = {};

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  setDefaultContext(context: Record<string, unknown>) {
    this.defaultContext = context;
  }

  clearDefaultContext() {
    this.defaultContext = {};
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): LogContext {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (level < this.minLevel) return;

    const logEntry = this.formatMessage(level, message, {
      ...this.defaultContext,
      ...context,
    });
    const color = {
      [LogLevel.DEBUG]: Colors.Gray,
      [LogLevel.INFO]: Colors.Blue,
      [LogLevel.WARN]: Colors.Yellow,
      [LogLevel.ERROR]: Colors.Red,
    }[level];

    const logString = JSON.stringify({
      level: LogLevel[level],
      message,
      timestamp: logEntry.timestamp,
      username: logEntry.username || 'unknown',
      ...context
    })
      .replace(/"(\w+)":/g, `${color}"$1":`) // Color keys and parentheses
      .replace(/: "(.*?)"/g, `: ${color}"$1"`) // Color values
      .concat(Colors.Reset); // Reset color at the end
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.INFO:
        console.info(logString);
        break;
      default:
        console.log(logString);
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof AppError ? error.toJSON() : {}),
      } : undefined,
    });
  }
}

export const logger = Logger.getInstance();
