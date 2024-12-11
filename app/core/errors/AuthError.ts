import { AppError } from './AppError'

export class AuthError extends AppError {
  constructor(
    message: string,
    code = 'AUTH_ERROR',
    statusCode = 401,
    context?: Record<string, unknown>
  ) {
    super(message, code, statusCode, context);
  }
}

export class SpotifyAuthError extends AuthError {
  constructor(message: string, statusCode = 401, context?: Record<string, unknown>) {
    super(message, 'SPOTIFY_AUTH_ERROR', statusCode, context);
  }
}
