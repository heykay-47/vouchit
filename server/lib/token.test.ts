import { beforeEach, describe, expect, it } from 'vitest';
import { createAuthCookie, signAuthToken, verifyAuthToken } from './token.js';

describe('token helpers', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('signs and verifies an auth token', () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    expect(verifyAuthToken(token)).toEqual({ userId: '507f1f77bcf86cd799439011' });
  });

  it('creates an httpOnly auth cookie', () => {
    const cookie = createAuthCookie('abc.def.ghi', true);
    expect(cookie).toContain('auth_token=abc.def.ghi');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=');
  });

  it('creates a session cookie when remember me is disabled', () => {
    const cookie = createAuthCookie('abc.def.ghi', false);
    expect(cookie).toContain('auth_token=abc.def.ghi');
    expect(cookie).not.toContain('Max-Age');
    expect(cookie).not.toContain('undefined');
  });
});
