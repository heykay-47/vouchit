import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import AuthModal from '@/components/AuthModal';
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

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthDialogMode>('login');
  const [isOpen, setIsOpen] = useState(false);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const [initialRole, setInitialRole] = useState<UserRole>('customer');
  const [onAuthenticated, setOnAuthenticated] = useState<((user: User) => void) | null>(null);
  const continuationConsumedRef = useRef(false);

  const close = () => {
    continuationConsumedRef.current = true;
    setOnAuthenticated(null);
    setIsOpen(false);
  };

  const open = (
    nextMode: AuthDialogMode,
    focusTarget?: HTMLElement | null,
    continuation?: (user: User) => void,
    nextRole: UserRole = 'customer',
  ) => {
    setMode(nextMode);
    setInitialRole(nextMode === 'signup' ? nextRole : 'customer');
    setReturnFocus(
      focusTarget === undefined && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : focusTarget ?? null,
    );
    continuationConsumedRef.current = false;
    setOnAuthenticated(() => continuation ?? null);
    setIsOpen(true);
  };

  const handleAuthenticated = (user: User) => {
    if (continuationConsumedRef.current) return;

    continuationConsumedRef.current = true;
    const continuation = onAuthenticated;
    setOnAuthenticated(null);
    setIsOpen(false);
    continuation?.(user);
  };

  return (
    <AuthDialogContext.Provider
      value={{
        openLogin: (focusTarget, continuation) => open('login', focusTarget, continuation),
        openSignup: (focusTarget, continuation, nextRole) => open('signup', focusTarget, continuation, nextRole),
        closeAuth: close,
      }}
    >
      {children}
      <AuthModal
        isOpen={isOpen}
        initialMode={mode}
        initialRole={initialRole}
        onClose={close}
        returnFocus={returnFocus}
        onAuthenticated={handleAuthenticated}
      />
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  const value = useContext(AuthDialogContext);
  if (!value) throw new Error('useAuthDialog must be used within AuthDialogProvider');
  return value;
}
