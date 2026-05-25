import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationService, InterestCategories } from '@/hooks/useNotificationService';
import { Notification as NotificationType } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import NotificationPreferences from './NotificationPreferences';
import { format } from 'date-fns';
import { Bell, Gift, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { communityService } from '@/services/community.service';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';

export default function UserNotifications() {
  const { user } = useAuth();
  const [interests, setInterests] = useState<InterestCategories>(['all']);

  const {
    notifications,
    isLoading,
    error
  } = useNotificationService(interests);

  const markAsRead = async (notificationId: string) => {
    try {
      await communityService.markNotificationRead(notificationId);
    } catch (err) {
      toast.error('Failed to update notification');
      logger.error('Error marking notification as read', err, {
        component: 'UserNotifications',
        notificationId,
      });
    }
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'voucher':
        return <Gift className="h-5 w-5 text-primary" />;
      case 'alert':
        return <AlertTriangle className="h-5 w-5 text-voucher-orange" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleUpdateInterests = (newInterests: InterestCategories) => {
    setInterests(newInterests);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Notifications</h2>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="relative">
            All
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : notifications && notifications.length > 0 ? (
            <AnimatePresence>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className={notification.isRead ? 'bg-muted/30' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getNotificationIcon(notification.type)}
                            <CardTitle className="text-base">
                              {notification.title}
                            </CardTitle>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{notification.message}</p>
                      </CardContent>
                      {!notification.isRead && (
                        <CardFooter>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark as read
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No notifications</h3>
                <p className="text-muted-foreground mt-2">
                  You'll see notifications about vouchers and system updates here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unread">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : notifications && notifications.filter(n => !n.isRead).length > 0 ? (
            <AnimatePresence>
              <div className="space-y-4">
                {notifications
                  .filter(n => !n.isRead)
                  .map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getNotificationIcon(notification.type)}
                              <CardTitle className="text-base">
                                {notification.title}
                              </CardTitle>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{notification.message}</p>
                        </CardContent>
                        <CardFooter>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark as read
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            </AnimatePresence>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No unread notifications</h3>
                <p className="text-muted-foreground mt-2">
                  You've caught up with all your notifications
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preferences">
          <NotificationPreferences
            interests={interests}
            onUpdateInterests={handleUpdateInterests}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
