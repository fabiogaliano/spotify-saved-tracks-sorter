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
  Green: "\x1b[32m",
} as const;

export class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = LogLevel.DEBUG;
  private defaultContext: Record<string, unknown> = {};

  private constructor() { }

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

    const logObject: Record<string, unknown> = {
      level: LogLevel[level],
      message,
      timestamp: logEntry.timestamp,
    };

    if (logEntry.username && logEntry.username !== 'unknown') {
      logObject.username = logEntry.username;
    }

    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        if (value !== undefined) {
          logObject[key] = value;
        }
      });
    }

    const logString = JSON.stringify(logObject)
      .replace(/"(\w+)":/g, `${color}"$1":`)
      .replace(/: "(.*?)"/g, `: ${color}"$1"`)
      .concat(Colors.Reset);

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

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    let errorDetails: any = undefined;
    if (error instanceof Error) {
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error !== undefined && error !== null) {
      try {
        errorDetails = String(error);
      } catch (e) {
        errorDetails = 'Could not convert error to string';
      }
    }

    this.log(LogLevel.ERROR, message, {
      ...context,
      error: errorDetails,
    });
  }

  AppError = class CustomError extends Error {
    code: string;
    statusCode: number;
    metadata: Record<string, unknown>;

    constructor(
      message: string,
      code: string,
      statusCode: number,
      metadata?: Record<string, unknown>
    ) {
      super(message);
      this.name = 'CustomError';
      this.code = code;
      this.statusCode = statusCode;
      this.metadata = metadata || {};

      Logger.getInstance().log(LogLevel.ERROR, message, {
        code,
        statusCode,
        ...metadata
      });
    }
  }
}

export const logger = Logger.getInstance();
