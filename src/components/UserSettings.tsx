import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Bell, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/services/api-client';

export default function UserSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState({
    email: user?.notificationPreferences?.email ?? true,
    newVouchers: user?.notificationPreferences?.newVouchers ?? true,
    voucherExpiry: user?.notificationPreferences?.voucherExpiry ?? true,
    systemUpdates: user?.notificationPreferences?.systemUpdates ?? true
  });

  const handleToggle = (key: keyof typeof notificationPrefs) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveSettings = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      await apiRequest('/api/users/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify(notificationPrefs),
      });

      toast.success('Settings saved successfully');
    } catch (error) {
      logger.error('Error saving settings', error, { component: 'UserSettings' });
      toast.error('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Account Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications" className="text-base">Email Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Receive notifications via email
              </div>
            </div>
            <Switch
              id="emailNotifications"
              checked={notificationPrefs.email}
              onCheckedChange={() => handleToggle('email')}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="newVouchers" className="text-base">New Vouchers</Label>
              <div className="text-sm text-muted-foreground">
                Get notified when new vouchers are added in your preferred categories
              </div>
            </div>
            <Switch
              id="newVouchers"
              checked={notificationPrefs.newVouchers}
              onCheckedChange={() => handleToggle('newVouchers')}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="voucherExpiry" className="text-base">Voucher Expiry</Label>
              <div className="text-sm text-muted-foreground">
                Get notified when your vouchers are about to expire
              </div>
            </div>
            <Switch
              id="voucherExpiry"
              checked={notificationPrefs.voucherExpiry}
              onCheckedChange={() => handleToggle('voucherExpiry')}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="systemUpdates" className="text-base">System Updates</Label>
              <div className="text-sm text-muted-foreground">
                Get notified about platform updates and new features
              </div>
            </div>
            <Switch
              id="systemUpdates"
              checked={notificationPrefs.systemUpdates}
              onCheckedChange={() => handleToggle('systemUpdates')}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveSettings} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Manage critical account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-base">Delete Account</Label>
              <div className="text-sm text-muted-foreground">
                Permanently delete your account and all your data
              </div>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
