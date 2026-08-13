import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  returnFocus?: HTMLElement | null;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login', returnFocus }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default to remembered
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, signup, isAuthenticated } = useAuth();

  // Close modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose]);

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setUsername('');
      setPassword('');
      setError(null);
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const switchMode = useCallback(() => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setError(null);
    setPassword('');
  }, []);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  }, [isSubmitting, onClose]);

  const validateForm = (): string | null => {
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail) {
      return 'Email is required';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return 'Please enter a valid email address';
    }

    if (mode === 'signup') {
      if (!trimmedUsername) {
        return 'Username is required';
      }
      if (trimmedUsername.length < 3) {
        return 'Username must be at least 3 characters';
      }
      if (trimmedUsername.length > 50) {
        return 'Username must be less than 50 characters';
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
        return 'Username can only contain letters, numbers, underscores, and hyphens';
      }
    }

    if (!password) {
      return 'Password is required';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password, rememberMe);
      } else {
        await signup(email.trim(), username.trim(), password, rememberMe);
      }
      // Modal will close via useEffect when isAuthenticated changes
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[425px]"
        onCloseAutoFocus={(event) => {
          if (!returnFocus) return;
          event.preventDefault();
          returnFocus.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl lowercase">
            {mode === 'login' ? 'welcome back' : 'create an account'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? 'enter your credentials to access your account'
              : 'sign up to start swapping vouchers'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Error message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-md bg-destructive/10 border border-destructive/20"
              >
                <p className="text-sm text-destructive lowercase">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="lowercase">
                email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                required
                autoComplete="email"
                disabled={isSubmitting}
                autoFocus
                className="h-11"
              />
            </div>

            {/* Username (signup only) */}
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label htmlFor="username" className="lowercase">
                    username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    autoComplete="username"
                    disabled={isSubmitting}
                    maxLength={50}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    letters, numbers, underscores, and hyphens only
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="lowercase">
                password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled={isSubmitting}
                className="h-11"
              />
            </div>

            {/* Remember Me */}
            <div className="flex min-h-11 items-center space-x-2 pt-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isSubmitting}
              />
              <Label
                htmlFor="rememberMe"
                className="flex min-h-11 flex-1 cursor-pointer select-none items-center text-sm font-normal lowercase"
              >
                remember me
              </Label>
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="h-11 w-full lowercase" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                {mode === 'login' ? 'logging in...' : 'signing up...'}
              </span>
            ) : mode === 'login' ? (
              'log in'
            ) : (
              'sign up'
            )}
          </Button>
        </form>

        {/* Switch Mode */}
        <div className="text-center text-sm pt-2">
          {mode === 'login' ? (
            <p>
              don't have an account?{' '}
              <Button
                type="button"
                variant="link"
                onClick={switchMode}
                className="min-h-11 px-2 lowercase"
                disabled={isSubmitting}
              >
                sign up
              </Button>
            </p>
          ) : (
            <p>
              already have an account?{' '}
              <Button
                type="button"
                variant="link"
                onClick={switchMode}
                className="min-h-11 px-2 lowercase"
                disabled={isSubmitting}
              >
                log in
              </Button>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
