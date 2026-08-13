import { createContext, useContext, useState, type ReactNode } from 'react';
import AuthModal from '@/components/AuthModal';

export type AuthDialogMode = 'login' | 'signup';

export interface AuthDialogContextValue {
  openLogin: (returnFocus?: HTMLElement | null) => void;
  openSignup: (returnFocus?: HTMLElement | null) => void;
  closeAuth: () => void;
}

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthDialogMode>('login');
  const [isOpen, setIsOpen] = useState(false);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);

  const open = (nextMode: AuthDialogMode, focusTarget?: HTMLElement | null) => {
    setMode(nextMode);
    setReturnFocus(
      focusTarget === undefined && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : focusTarget ?? null,
    );
    setIsOpen(true);
  };

  return (
    <AuthDialogContext.Provider
      value={{
        openLogin: (focusTarget) => open('login', focusTarget),
        openSignup: (focusTarget) => open('signup', focusTarget),
        closeAuth: () => setIsOpen(false),
      }}
    >
      {children}
      <AuthModal
        isOpen={isOpen}
        initialMode={mode}
        onClose={() => setIsOpen(false)}
        returnFocus={returnFocus}
      />
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  const value = useContext(AuthDialogContext);
  if (!value) throw new Error('useAuthDialog must be used within AuthDialogProvider');
  return value;
}
