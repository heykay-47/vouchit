import type { NextFunction, Request, Response } from 'express';
import { parse } from 'cookie';
import { ApiError } from '../lib/http.js';
import { verifyAuthToken } from '../lib/token.js';

export type AuthedRequest = Request & {
  userId: string;
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const cookies = parse(req.headers.cookie ?? '');
  const token = cookies.auth_token;

  if (!token) {
    next(new ApiError(401, 'Authentication required'));
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    (req as AuthedRequest).userId = payload.userId;
    next();
  } catch {
    next(new ApiError(401, 'Authentication required'));
  }
};
