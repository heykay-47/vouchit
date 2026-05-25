import { User as AppUser } from '@/lib/types';
import { apiRequest } from './api-client';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AppUser;
  requiresEmailConfirmation?: boolean;
}

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

export const signUpWithEmail = async (
  email: string,
  password: string,
  username: string,
  rememberMe = false
): Promise<AuthResult> => {
  return authCall(() =>
    apiRequest<{ user: AppUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, rememberMe }),
    })
  );
};

export const signInWithEmail = async (
  email: string,
  password: string,
  rememberMe = false
): Promise<AuthResult> => {
  return authCall(() =>
    apiRequest<{ user: AppUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    })
  );
};

export const signOut = async (): Promise<AuthResult> => {
  return authCall(() => apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' }));
};

export const getCurrentUser = async () => {
  return apiRequest<{ user: AppUser }>('/api/auth/me');
};

export const updateProfile = async (updates: Partial<AppUser>) => {
  const { user } = await apiRequest<{ user: AppUser }>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return user;
};
