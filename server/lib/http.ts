import type { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const ok = <T>(res: Response, data: T, status = 200) => {
  return res.status(status).json({ data, error: null });
};

export const fail = (res: Response, status: number, message: string) => {
  return res.status(status).json({ data: null, error: { message } });
};

export const asyncRoute = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
};
