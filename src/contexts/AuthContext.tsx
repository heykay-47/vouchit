import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { AuthContextType, SignupInput, User as AppUser } from '@/lib/types';
import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  updateProfile as updateProfileService,
} from '@/services/auth.service';
import { apiRequest } from '@/services/api-client';
import { toast } from '@/utils/toast';
import { createLogger } from '@/utils/logger';

const logger = createLogger({ context: { component: 'AuthContext' } });

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const { user: apiUser } = await getCurrentUser();
        if (mountedRef.current) {
          setUser(apiUser ?? null);
          setIsLoading(false);
        }
      } catch {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    init();

    const handleAuth401 = () => {
      if (mountedRef.current) {
        setUser(null);
        toast.error('Your session has expired. Please log in again.');
      }
    };
    window.addEventListener('auth:401', handleAuth401);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('auth:401', handleAuth401);
    };
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    const result = await signInWithEmail(email, password, rememberMe);
    if (!result.success) {
      setIsLoading(false);
      toast.error(result.error || 'Login failed');
      throw new Error(result.error);
    }
    if (!result.user) {
      setIsLoading(false);
      toast.error('Login failed');
      throw new Error('Login failed');
    }
    setUser(result.user);
    setIsLoading(false);
    toast.success('Welcome back!');
    return result.user;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    setIsLoading(true);
    const result = await signUpWithEmail(input);
    if (!result.success) {
      setIsLoading(false);
      toast.error(result.error || 'Signup failed');
      throw new Error(result.error);
    }
    if (!result.user) {
      setIsLoading(false);
      toast.error('Signup failed');
      throw new Error('Signup failed');
    }
    setUser(result.user);
    setIsLoading(false);
    toast.success('Account created successfully!');
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const result = await signOut();
    if (!result.success) {
      toast.error('Logout failed');
    } else {
      toast.success('Logged out successfully');
    }
    setUser(null);
    setIsLoading(false);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<AppUser>) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    try {
      const updatedUser = await updateProfileService(updates);
      setUser(updatedUser);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }, [user]);


  const toggleFavorite = useCallback(async (voucherId: string) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const favorites = user.favorites ?? [];
    const isFavorite = favorites.includes(voucherId);

    try {
      await apiRequest<{ voucherId: string }>(`/api/users/me/favorites/${voucherId}`, {
        method: isFavorite ? 'DELETE' : 'POST',
      });

      setUser((prev) => {
        if (!prev) return prev;
        const currentFavorites = prev.favorites ?? [];
        return {
          ...prev,
          favorites: isFavorite
            ? currentFavorites.filter((id) => id !== voucherId)
            : [...currentFavorites, voucherId],
        };
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update favorite');
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      const { user: apiUser } = await getCurrentUser();
      if (apiUser && mountedRef.current) {
        setUser(apiUser);
      }
    } catch (error) {
      logger.error('Error refreshing user', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    updateProfile,
    toggleFavorite,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
