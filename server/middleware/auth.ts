import type { NextFunction, Request, Response } from 'express';
import { parse } from 'cookie';
import { connectDb } from '../lib/db.js';
import { ApiError } from '../lib/http.js';
import { verifyAuthToken } from '../lib/token.js';
import { resolveUserRole, type UserRole } from '../lib/roles.js';
import { User } from '../models/User.js';

export type AuthedRequest = Request & {
  userId: string;
  userRole?: UserRole;
};

export type OptionallyAuthedRequest = Request & {
  userId?: string;
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

export const requireRole = (...allowed: UserRole[]) => async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    await connectDb();
    const user = await User.findById((req as AuthedRequest).userId);
    if (!user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    const role = resolveUserRole(user.role);
    if (!allowed.includes(role)) {
      next(new ApiError(403, 'Forbidden'));
      return;
    }

    (req as AuthedRequest).userRole = role;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const cookies = parse(req.headers.cookie ?? '');
  const token = cookies.auth_token;

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    (req as OptionallyAuthedRequest).userId = payload.userId;
  } catch {
    // ignore invalid tokens for optional auth
  }
  next();
};

export const getOptionalUserId = (req: Request): string | undefined => {
  return (req as OptionallyAuthedRequest).userId;
};
