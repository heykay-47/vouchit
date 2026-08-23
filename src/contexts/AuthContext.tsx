import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
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
  const userRef = useRef<AppUser | null>(null);
  const isViewerResolvedRef = useRef(false);
  const authRequestRef = useRef<Promise<void> | null>(null);
  const authGenerationRef = useRef(0);
  const authTransitionRef = useRef(false);
  const queryClient = useQueryClient();

  const clearViewerQueries = useCallback(() => {
    queryClient.removeQueries({ queryKey: offersQueryKey });
    queryClient.removeQueries({ queryKey: vouchersQueryKey });
  }, [queryClient]);

  const invalidateViewerResolution = useCallback(() => {
    authGenerationRef.current += 1;
    authRequestRef.current = null;
  }, []);

  const resolveViewer = useCallback(() => {
    if (authTransitionRef.current) return Promise.resolve();
    if (authRequestRef.current) return authRequestRef.current;

    const generation = authGenerationRef.current;
    const request = (async () => {
      try {
        const { user: apiUser } = await getCurrentUser();
        if (mountedRef.current && generation === authGenerationRef.current) {
          if (apiUser && apiUser.id !== userRef.current?.id) clearViewerQueries();
          userRef.current = apiUser ?? null;
          isViewerResolvedRef.current = true;
          setUser(apiUser ?? null);
          setIsViewerResolved(true);
        }
      } catch (error) {
        if (mountedRef.current && generation === authGenerationRef.current) {
          if (error instanceof ApiClientError && error.status === 401) {
            if (!isViewerResolvedRef.current || userRef.current !== null) clearViewerQueries();
            userRef.current = null;
            isViewerResolvedRef.current = true;
            setUser(null);
            setIsViewerResolved(true);
          } else {
            logger.error('Error resolving viewer', error);
          }
        }
      } finally {
        if (generation === authGenerationRef.current) {
          authRequestRef.current = null;
          if (mountedRef.current) setIsLoading(false);
        }
      }
    })();

    authRequestRef.current = request;
    return request;
  }, [clearViewerQueries]);

  useEffect(() => {
    mountedRef.current = true;
    void resolveViewer();

    const handleAuth401 = () => {
      if (mountedRef.current) {
        invalidateViewerResolution();
        userRef.current = null;
        isViewerResolvedRef.current = true;
        setUser(null);
        setIsViewerResolved(true);
        clearViewerQueries();
        if (!authTransitionRef.current) setIsLoading(false);
        toast.error('Your session has expired. Please log in again.');
      }
    };
    window.addEventListener('auth:401', handleAuth401);
    const unsubscribeOnline = onlineManager.subscribe((isOnline) => {
      if (isOnline && !isViewerResolvedRef.current) void resolveViewer();
    });

    return () => {
      mountedRef.current = false;
      window.removeEventListener('auth:401', handleAuth401);
      unsubscribeOnline();
    };
  }, [clearViewerQueries, invalidateViewerResolution, resolveViewer]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    authTransitionRef.current = true;
    invalidateViewerResolution();
    setIsLoading(true);
    try {
      const result = await signInWithEmail(email, password, rememberMe);
      if (!result.success) {
        toast.error(result.error || 'Login failed');
        throw new Error(result.error);
      }
      if (!result.user) {
        toast.error('Login failed');
        throw new Error('Login failed');
      }
      clearViewerQueries();
      userRef.current = result.user;
      isViewerResolvedRef.current = true;
      setUser(result.user);
      setIsViewerResolved(true);
      toast.success('Welcome back!');
      return result.user;
    } finally {
      authTransitionRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, [clearViewerQueries, invalidateViewerResolution]);

  const signup = useCallback(async (input: SignupInput) => {
    authTransitionRef.current = true;
    invalidateViewerResolution();
    setIsLoading(true);
    try {
      const result = await signUpWithEmail(input);
      if (!result.success) {
        toast.error(result.error || 'Signup failed');
        throw new Error(result.error);
      }
      if (!result.user) {
        toast.error('Signup failed');
        throw new Error('Signup failed');
      }
      clearViewerQueries();
      userRef.current = result.user;
      isViewerResolvedRef.current = true;
      setUser(result.user);
      setIsViewerResolved(true);
      toast.success('Account created successfully!');
      return result.user;
    } finally {
      authTransitionRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, [clearViewerQueries, invalidateViewerResolution]);

  const logout = useCallback(async () => {
    authTransitionRef.current = true;
    invalidateViewerResolution();
    setIsLoading(true);
    try {
      const result = await signOut();
      clearViewerQueries();
      userRef.current = null;
      setUser(null);

      if (!result.success) {
        isViewerResolvedRef.current = false;
        setIsViewerResolved(false);
        toast.error('Logout failed');
        return;
      }

      isViewerResolvedRef.current = true;
      setIsViewerResolved(true);
      toast.success('Logged out successfully');
    } catch (error) {
      clearViewerQueries();
      userRef.current = null;
      isViewerResolvedRef.current = false;
      setUser(null);
      setIsViewerResolved(false);
      toast.error('Logout failed');
      throw error;
    } finally {
      authTransitionRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, [clearViewerQueries, invalidateViewerResolution]);

  const updateProfile = useCallback(async (updates: Partial<AppUser>) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    try {
      const updatedUser = await updateProfileService(updates);
      userRef.current = updatedUser;
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
    await resolveViewer();
  }, [resolveViewer]);

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
