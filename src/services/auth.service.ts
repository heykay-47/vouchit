import type { SignupInput, User as AppUser } from '@/lib/types';
import { apiRequest } from './api-client';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AppUser;
  requiresEmailConfirmation?: boolean;
}

type ApiUser = Omit<AppUser, 'createdAt'> & { createdAt: string | Date };

export const hydrateUser = (user: ApiUser): AppUser => ({
  ...user,
  createdAt: new Date(user.createdAt),
});

const authCall = async <T>(fn: () => Promise<T>): Promise<AuthResult & T> => {
  try {
    const data = await fn();
    return { success: true, ...data } as AuthResult & T;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    } as AuthResult & T;
  }
};

const hydrateAuthResult = (result: AuthResult & { user?: ApiUser }): AuthResult => ({
  ...result,
  ...(result.user ? { user: hydrateUser(result.user) } : {}),
});

export const signUpWithEmail = async (
  input: SignupInput,
): Promise<AuthResult> => {
  const result = await authCall(() =>
    apiRequest<{ user: ApiUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  return hydrateAuthResult(result);
};

export const signInWithEmail = async (
  email: string,
  password: string,
  rememberMe = false
): Promise<AuthResult> => {
  const result = await authCall(() =>
    apiRequest<{ user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    }, { suppressAuthEvent: true }),
  );
  return hydrateAuthResult(result);
};

export const signOut = async (): Promise<AuthResult> => {
  return authCall(() => apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' }));
};

export const getCurrentUser = async () => {
  const result = await apiRequest<{ user: ApiUser }>(
    '/api/auth/me',
    {},
    { suppressAuthEvent: true },
  );
  return { ...result, user: hydrateUser(result.user) };
};

export const updateProfile = async (updates: Partial<AppUser>) => {
  const { user } = await apiRequest<{ user: ApiUser }>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return hydrateUser(user);
};
