import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client';
import { getCurrentUser, signInWithEmail, signUpWithEmail } from './auth.service';
import type { SignupInput } from '@/lib/types';

vi.mock('./api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const apiUser = {
  id: 'user-1',
  email: 'ops@example.com',
  username: 'ops',
  createdAt: '2026-08-19T12:00:00.000Z',
  role: 'business' as const,
  redeemedVouchers: [],
};

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiRequest.mockResolvedValue({ user: apiUser });
  });

  it('sends the customer signup body without business fields', async () => {
    const input: SignupInput = {
      role: 'customer',
      email: 'customer@example.com',
      username: 'customer',
      password: 'secret123',
      rememberMe: true,
    };

    await signUpWithEmail(input);

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('sends business signup fields and hydrates the returned date', async () => {
    const input: SignupInput = {
      role: 'business',
      email: 'ops@example.com',
      username: 'ops',
      password: 'secret123',
      rememberMe: true,
      organizationName: 'Acme Offers',
      contactName: 'Asha Rao',
      website: 'https://acme.example',
    };

    const result = await signUpWithEmail(input);

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(result.user?.createdAt).toEqual(new Date(apiUser.createdAt));
  });

  it('suppresses login auth events while hydrating the returned user', async () => {
    const result = await signInWithEmail('ops@example.com', 'secret123', true);

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ops@example.com', password: 'secret123', rememberMe: true }),
    }, { suppressAuthEvent: true });
    expect(result.user?.createdAt).toEqual(new Date(apiUser.createdAt));
  });

  it('handles current-user authorization locally', async () => {
    const result = await getCurrentUser();

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/api/auth/me',
      {},
      { suppressAuthEvent: true },
    );
    expect(result.user.createdAt).toEqual(new Date(apiUser.createdAt));
  });
});
