import { AppError } from './AppError'

export class ApiError extends AppError {
  constructor(
    message: string,
    code = 'API_ERROR',
    statusCode = 500,
    context?: Record<string, unknown>
  ) {
    super(message, code, statusCode, context);
  }
}

export class SpotifyApiError extends ApiError {
  constructor(message: string, statusCode = 500, context?: Record<string, unknown>) {
    super(message, 'SPOTIFY_API_ERROR', statusCode, context);
  }
}

export class GeniusApiError extends ApiError {
  constructor(message: string, statusCode = 500, context?: Record<string, unknown>) {
    super(message, 'GENIUS_API_ERROR', statusCode, context);
  }
}
