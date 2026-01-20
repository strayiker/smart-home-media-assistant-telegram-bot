/**
 * Base error class for all application errors.
 * Extends Error with additional metadata for structured logging and error handling.
 */
export abstract class AppError extends Error {
  /**
   * Error code for machine-readable error identification.
   * Should be in format: CATEGORY_SPECIFIC_ERROR (e.g., 'SEARCH_FAILED', 'TORRENT_NOT_FOUND')
   */
  abstract readonly code: string;

  /**
   * HTTP status code (if applicable for API errors).
   * Default: 500 (Internal Server Error)
   */
  readonly statusCode: number;

  /**
   * Whether this error is operational (expected) vs unexpected.
   * Operational errors should be handled gracefully without crashing the application.
   */
  readonly isOperational: boolean;

  /**
   * Additional error details for debugging/logging.
   */
  readonly details?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    details?: Record<string, unknown> | undefined,
    statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Search-related errors.
 * Thrown when search operations fail or return no results.
 */
export class SearchError extends AppError {
  readonly code = 'SEARCH_FAILED';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details, 400);
  }
}

/**
 * Torrent-related errors.
 * Thrown when torrent operations fail.
 */
export class TorrentError extends AppError {
  readonly code = 'TORRENT_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details, 400);
  }
}

/**
 * File/media-related errors.
 * Thrown when file operations or transcoding fail.
 */
export class MediaError extends AppError {
  readonly code = 'MEDIA_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details, 400);
  }
}

/**
 * Resource not found errors.
 * Thrown when a requested resource doesn't exist.
 */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';

  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;
    super(message, { resource, identifier }, 404);
  }
}
