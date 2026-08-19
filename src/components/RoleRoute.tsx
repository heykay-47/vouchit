import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

interface RoleRouteProps {
  role: UserRole;
  children: ReactNode;
}

export function RoleRoute({ role, children }: RoleRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'business' ? '/business' : '/dashboard'} replace />;

  return <>{children}</>;
}

export default RoleRoute;
