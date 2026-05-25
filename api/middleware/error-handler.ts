import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError, fail } from '../lib/http';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    fail(res, error.status, error.message);
    return;
  }

  if (error instanceof ZodError) {
    fail(res, 400, error.issues[0]?.message ?? 'Invalid request');
    return;
  }

  fail(res, 500, 'Internal server error');
};
