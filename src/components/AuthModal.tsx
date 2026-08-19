import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SignupInput, User, UserRole } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  initialRole?: UserRole;
  returnFocus?: HTMLElement | null;
  onAuthenticated?: (user: User) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'customer',
  returnFocus,
  onAuthenticated,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [contactName, setContactName] = useState('');
  const [website, setWebsite] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default to remembered
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, signup } = useAuth();

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setUsername('');
      setPassword('');
      setOrganizationName('');
      setContactName('');
      setWebsite('');
      setError(null);
      setMode(initialMode);
      setRole(initialRole);
    }
  }, [isOpen, initialMode, initialRole]);

  const switchMode = useCallback(() => {
    setMode((prev) => {
      const nextMode = prev === 'login' ? 'signup' : 'login';
      if (nextMode === 'signup') setRole('customer');
      return nextMode;
    });
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

      if (role === 'business') {
        if (!organizationName.trim()) {
          return 'Organization name is required';
        }
        if (!contactName.trim()) {
          return 'Contact name is required';
        }
      }
    }

    if (!password) {
      return 'Password is required';
    }

    if (password.length < 8) {
      return 'Password must be at least 8 characters';
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
    let authenticatedUser: User;

    try {
      if (mode === 'login') {
        authenticatedUser = await login(email.trim(), password, rememberMe);
      } else {
        const baseInput = {
          email: email.trim(),
          username: username.trim(),
          password,
          rememberMe,
        };
        const input: SignupInput = role === 'business'
          ? {
              ...baseInput,
              role,
              organizationName: organizationName.trim(),
              contactName: contactName.trim(),
              ...(website.trim() ? { website: website.trim() } : {}),
            }
          : { ...baseInput, role };
        authenticatedUser = await signup(input);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      return;
    } finally {
      setIsSubmitting(false);
    }

    onAuthenticated?.(authenticatedUser);
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
              : role === 'business'
                ? 'create campaigns, distribute voucher inventory, and record external settlement before publishing'
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

            {/* Account role (signup only) */}
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label id="account-type-label" htmlFor="account-type" className="lowercase">
                    account type
                  </Label>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value === 'business' ? 'business' : 'customer')}
                  >
                    <SelectTrigger
                      id="account-type"
                      aria-labelledby="account-type-label"
                      className="h-11"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">customer</SelectItem>
                      <SelectItem value="business">business</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* Business details (business signup only) */}
            <AnimatePresence>
              {mode === 'signup' && role === 'business' && (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="organizationName" className="lowercase">
                      organization name
                    </Label>
                    <Input
                      id="organizationName"
                      type="text"
                      value={organizationName}
                      onChange={(e) => {
                        setOrganizationName(e.target.value);
                        setError(null);
                      }}
                      required
                      autoComplete="organization"
                      disabled={isSubmitting}
                      maxLength={120}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName" className="lowercase">
                      contact name
                    </Label>
                    <Input
                      id="contactName"
                      type="text"
                      value={contactName}
                      onChange={(e) => {
                        setContactName(e.target.value);
                        setError(null);
                      }}
                      required
                      autoComplete="name"
                      disabled={isSubmitting}
                      maxLength={120}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website" className="lowercase">
                      website
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      value={website}
                      onChange={(e) => {
                        setWebsite(e.target.value);
                        setError(null);
                      }}
                      placeholder="https://acme.example"
                      autoComplete="url"
                      disabled={isSubmitting}
                      className="h-11"
                    />
                  </div>
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
                minLength={8}
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
