import { AppError } from './AppError'

export class DbError extends AppError {
  constructor(
    message: string,
    code = 'DB_ERROR',
    statusCode = 500,
    context?: Record<string, unknown>
  ) {
    super(message, code, statusCode, context);
  }
}

export class SupabaseError extends DbError {
  constructor(message: string, statusCode = 500, context?: Record<string, unknown>) {
    super(message, 'SUPABASE_ERROR', statusCode, context);
  }
}
