/**
 * Application-level error class.
 * Only AppError messages are safe to expose to clients.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

/**
 * 404 shorthand
 */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

/**
 * 403 shorthand
 */
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

/**
 * 401 shorthand
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

// ──────── Patterns for detecting internal / SQL error messages ────────
const INTERNAL_PATTERNS = [
  /failed query/i,
  /insert into/i,
  /select\s+/i,
  /update\s+/i,
  /delete from/i,
  /violates\s+(unique|foreign\s+key|check|not-null)/i,
  /duplicate key value/i,
  /null value in column/i,
  /invalid input syntax/i,
  /relation\s+".*"\s+does not exist/i,
  /column\s+".*"\s+/i,
  /syntax error at/i,
  /params:\s*\[/i,
];

/**
 * Sanitize an error for client consumption.
 * AppErrors are considered safe; everything else is replaced with a generic message.
 */
export function sanitizeError(err: unknown): { message: string; statusCode: number } {
  if (err instanceof AppError) {
    return { message: err.message, statusCode: err.statusCode };
  }

  const raw = err instanceof Error ? err.message : String(err);

  // If it looks like an internal / SQL error, mask it
  const isInternal = INTERNAL_PATTERNS.some((p) => p.test(raw));
  if (isInternal) {
    console.error("🔒 Suppressed internal error:", raw);
    return { message: "An unexpected error occurred", statusCode: 500 };
  }

  // Even for non-SQL errors we didn't anticipate, be cautious
  console.error("⚠️  Unhandled error:", raw);
  return { message: "An unexpected error occurred", statusCode: 500 };
}
