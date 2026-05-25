import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Notification, NotificationPreferences, VoucherCategory } from '@/lib/types';
import { apiRequest } from '@/services/api-client';
import { communityService } from '@/services/community.service';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';

export type InterestCategories = Array<VoucherCategory | 'all'>;

export function useNotificationService(_interests: InterestCategories = ['all']) {
  const { user, refreshUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setNotifications(await communityService.listNotifications());
    } catch (err) {
      toast.error("Couldn't fetch your notifications.");
      logger.error('Error fetching notifications', err, {
        component: 'useNotificationService',
        action: 'fetchNotifications',
      });
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveNotificationPreference = useCallback(async (enabled: boolean) => {
    if (!user) return;

    try {
      const nextPreferences: NotificationPreferences = {
        email: user.notificationPreferences?.email ?? true,
        newVouchers: enabled,
        voucherExpiry: user.notificationPreferences?.voucherExpiry ?? true,
        systemUpdates: user.notificationPreferences?.systemUpdates ?? true,
      };

      await apiRequest<{ notificationPreferences: NotificationPreferences }>('/api/users/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify(nextPreferences),
      });
      await refreshUser();
    } catch (err) {
      toast.error('Failed to save your notification preferences.');
      logger.error('Error saving notification preference', err, {
        component: 'useNotificationService',
        action: 'savePreference',
      });
    }
  }, [refreshUser, user]);

  const toggleNotifications = useCallback(() => {
    const nextEnabled = !isEnabled;
    setIsEnabled(nextEnabled);
    saveNotificationPreference(nextEnabled);
    toast.success(`Notifications ${nextEnabled ? 'enabled' : 'disabled'}`);
  }, [isEnabled, saveNotificationPreference]);

  useEffect(() => {
    if (user?.notificationPreferences) {
      setIsEnabled(user.notificationPreferences.newVouchers);
    }

    fetchNotifications();

    if (!user) return undefined;

    const interval = window.setInterval(fetchNotifications, 60_000);
    return () => window.clearInterval(interval);
  }, [fetchNotifications, user]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  return {
    notifications,
    isEnabled,
    toggleNotifications,
    isLoading,
    error,
    requestNotificationPermission,
  };
}
