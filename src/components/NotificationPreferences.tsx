
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationService, InterestCategories } from '@/hooks/useNotificationService';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { VoucherCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/utils/toast';

interface NotificationPreferencesProps {
  interests?: InterestCategories;
  onUpdateInterests?: (interests: InterestCategories) => void;
}

export default function NotificationPreferences({
  interests = ['all'],
  onUpdateInterests
}: NotificationPreferencesProps) {
  const { user } = useAuth();
  const { 
    isEnabled, 
    toggleNotifications, 
    requestNotificationPermission 
  } = useNotificationService(interests);

  // Available categories for user to select
  const availableCategories: VoucherCategory[] = [
    'Food', 'Shopping', 'Travel', 'Entertainment', 'Electronics', 'Health', 'Other'
  ];

  // Updates user's voucher notification settings in real-time
  const handleToggleNotifications = async () => {
    if (!isEnabled) {
      // Request permission before enabling
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        toast.error('Notification permission denied. Please enable in browser settings.');
        return;
      }
    }
    toggleNotifications();
  };

  // Subscribes user to notifications for specific voucher categories
  const addInterest = (category: VoucherCategory) => {
    if (!onUpdateInterests) return;
    
    const newInterests = [...interests];
    // Remove 'all' if it exists and we're adding a specific category
    const allIndex = newInterests.indexOf('all');
    if (allIndex !== -1) {
      newInterests.splice(allIndex, 1);
    }
    
    // Only adds new voucher category if not already in user's preferences
    if (!newInterests.includes(category)) {
      newInterests.push(category);
      onUpdateInterests(newInterests);
      toast.success(`Added ${category} to your interests`);
    }
  };

  // Remove a category from interests
  const removeInterest = (category: 'all' | VoucherCategory) => {
    if (!onUpdateInterests) return;
    
    const newInterests = interests.filter(i => i !== category);
    
    // If removing all interests, default to 'all'
    if (newInterests.length === 0) {
      newInterests.push('all');
    }
    
    onUpdateInterests(newInterests);
    toast.success(`Removed ${category} from your interests`);
  };

  // Determine which categories are not yet in interests
  const availableToAdd = availableCategories.filter(
    cat => !interests.includes(cat)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Receive alerts when new vouchers are added
            </p>
          </div>
          <Switch 
            checked={isEnabled} 
            onCheckedChange={handleToggleNotifications} 
            aria-label="Toggle notifications"
          />
        </div>

        {isEnabled && (
          <div>
            <h3 className="text-sm font-medium mb-2">Your Interests</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {interests.map(interest => (
                <Badge 
                  key={interest} 
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                >
                  {interest}
                  <button 
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    onClick={() => removeInterest(interest)}
                    aria-label={`Remove ${interest} interest`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>

            {availableToAdd.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Add Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {availableToAdd.map(category => (
                    <Badge 
                      key={category}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => addInterest(category)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
