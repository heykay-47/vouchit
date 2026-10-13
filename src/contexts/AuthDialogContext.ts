import { createContext, useContext } from 'react';
import type { User, UserRole } from '@/lib/types';

export type AuthDialogMode = 'login' | 'signup';

export interface AuthDialogContextValue {
  openLogin: (returnFocus?: HTMLElement | null, onAuthenticated?: (user: User) => void) => void;
  openSignup: (
    returnFocus?: HTMLElement | null,
    onAuthenticated?: (user: User) => void,
    initialRole?: UserRole,
  ) => void;
  closeAuth: () => void;
}

export const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function useAuthDialog() {
  const value = useContext(AuthDialogContext);
  if (!value) throw new Error('useAuthDialog must be used within AuthDialogProvider');
  return value;
}
