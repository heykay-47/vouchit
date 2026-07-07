import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

export type AuthTokenPayload = {
  userId: string;
};

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }
  return process.env.JWT_SECRET;
};

export const signAuthToken = (payload: AuthTokenPayload, expiresIn: SignOptions['expiresIn']) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || !decoded.userId) {
    throw new Error('Invalid auth token');
  }
  return { userId: String(decoded.userId) };
};

export const createAuthCookie = (token: string, rememberMe: boolean) => {
  const options = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? ('strict' as const) : ('lax' as const),
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {}),
  } as const;

  return serialize('auth_token', token, options);
};

export const clearAuthCookie = () => {
  return serialize('auth_token', '', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? ('strict' as const) : ('lax' as const),
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
};
