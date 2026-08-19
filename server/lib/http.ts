import type { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const ok = <T>(res: Response, data: T, status = 200) => {
  return res.status(status).json({ data, error: null });
};

export const fail = (res: Response, status: number, message: string, details?: unknown) => {
  return res.status(status).json({
    data: null,
    error: {
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
};

export const asyncRoute = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
};
