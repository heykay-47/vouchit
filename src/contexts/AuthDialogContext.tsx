import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import AuthModal from '@/components/AuthModal';

export type AuthDialogMode = 'login' | 'signup';

export interface AuthDialogContextValue {
  openLogin: (returnFocus?: HTMLElement | null, onAuthenticated?: () => void) => void;
  openSignup: (returnFocus?: HTMLElement | null, onAuthenticated?: () => void) => void;
  closeAuth: () => void;
}

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthDialogMode>('login');
  const [isOpen, setIsOpen] = useState(false);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const [onAuthenticated, setOnAuthenticated] = useState<(() => void) | null>(null);
  const continuationConsumedRef = useRef(false);

  const close = () => {
    continuationConsumedRef.current = true;
    setOnAuthenticated(null);
    setIsOpen(false);
  };

  const open = (
    nextMode: AuthDialogMode,
    focusTarget?: HTMLElement | null,
    continuation?: () => void,
  ) => {
    setMode(nextMode);
    setReturnFocus(
      focusTarget === undefined && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : focusTarget ?? null,
    );
    continuationConsumedRef.current = false;
    setOnAuthenticated(() => continuation ?? null);
    setIsOpen(true);
  };

  const handleAuthenticated = () => {
    if (continuationConsumedRef.current) return;

    continuationConsumedRef.current = true;
    const continuation = onAuthenticated;
    setOnAuthenticated(null);
    setIsOpen(false);
    continuation?.();
  };

  return (
    <AuthDialogContext.Provider
      value={{
        openLogin: (focusTarget, continuation) => open('login', focusTarget, continuation),
        openSignup: (focusTarget, continuation) => open('signup', focusTarget, continuation),
        closeAuth: close,
      }}
    >
      {children}
      <AuthModal
        isOpen={isOpen}
        initialMode={mode}
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
