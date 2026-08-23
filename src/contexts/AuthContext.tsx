import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthContextType, SignupInput, User as AppUser } from '@/lib/types';
import { offersQueryKey } from '@/hooks/useOffersQuery';
import { vouchersQueryKey } from '@/hooks/useVouchersQuery';
import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  updateProfile as updateProfileService,
} from '@/services/auth.service';
import { ApiClientError, apiRequest } from '@/services/api-client';
import { toast } from '@/utils/toast';
import { createLogger } from '@/utils/logger';

const logger = createLogger({ context: { component: 'AuthContext' } });

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewerResolved, setIsViewerResolved] = useState(false);
  const mountedRef = useRef(true);
  const queryClient = useQueryClient();

  const clearViewerQueries = useCallback(() => {
    queryClient.removeQueries({ queryKey: offersQueryKey });
    queryClient.removeQueries({ queryKey: vouchersQueryKey });
  }, [queryClient]);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const { user: apiUser } = await getCurrentUser();
        if (mountedRef.current) {
          if (apiUser) clearViewerQueries();
          setUser(apiUser ?? null);
          setIsViewerResolved(true);
          setIsLoading(false);
        }
      } catch (error) {
        if (mountedRef.current) {
          if (error instanceof ApiClientError && error.status === 401) {
            setIsViewerResolved(true);
          }
          setIsLoading(false);
        }
      }
    };

    init();

    const handleAuth401 = () => {
      if (mountedRef.current) {
        setUser(null);
        setIsViewerResolved(true);
        clearViewerQueries();
        toast.error('Your session has expired. Please log in again.');
      }
    };
    window.addEventListener('auth:401', handleAuth401);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('auth:401', handleAuth401);
    };
  }, [clearViewerQueries]);

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
    clearViewerQueries();
    setUser(result.user);
    setIsViewerResolved(true);
    setIsLoading(false);
    toast.success('Welcome back!');
    return result.user;
  }, [clearViewerQueries]);

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
    clearViewerQueries();
    setUser(result.user);
    setIsViewerResolved(true);
    setIsLoading(false);
    toast.success('Account created successfully!');
    return result.user;
  }, [clearViewerQueries]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const result = await signOut();
    if (!result.success) {
      toast.error('Logout failed');
      setIsLoading(false);
      return;
    }
    toast.success('Logged out successfully');
    setUser(null);
    setIsViewerResolved(true);
    clearViewerQueries();
    setIsLoading(false);
  }, [clearViewerQueries]);

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
        if (apiUser.id !== user?.id) clearViewerQueries();
        setUser(apiUser);
        setIsViewerResolved(true);
      }
    } catch (error) {
      logger.error('Error refreshing user', error);
    }
  }, [clearViewerQueries, user?.id]);

  const value: AuthContextType = {
    user,
    viewerKey: isViewerResolved ? user?.id ?? 'anonymous' : null,
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
