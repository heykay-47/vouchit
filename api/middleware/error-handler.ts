import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError, fail } from '../lib/http.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    fail(res, error.status, error.message);
    return;
  }

  if (error instanceof ZodError) {
    fail(res, 400, error.issues[0]?.message ?? 'Invalid request');
    return;
  }

  // Mongoose CastError (bad ObjectId passed directly, etc.)
  if (error.name === 'CastError') {
    const castError = error as { path?: string; value?: unknown };
    fail(res, 400, `Invalid ${castError.path ?? 'field'}: ${String(castError.value)}`);
    return;
  }

  // Mongoose ValidationError
  if (error.name === 'ValidationError') {
    fail(res, 400, error.message);
    return;
  }

  // Duplicate key (E11000) — race-condition fallback
  if ((error as { code?: number }).code === 11000) {
    fail(res, 409, 'Duplicate value');
    return;
  }

  // Unexpected errors — log and hide details
  process.stderr.write(`Unhandled error: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  fail(res, 500, 'Internal server error');
};
