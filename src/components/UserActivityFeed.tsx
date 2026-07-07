import { useState, useEffect } from 'react';
import { UserActivity } from '@/lib/types';
import { communityService } from '@/services/community.service';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Gift, MessageSquare, FileText, HeartHandshake } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UserActivityFeedProps {
  limit?: number;
}

export default function UserActivityFeed({ limit = 10 }: UserActivityFeedProps) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const data = await communityService.activities();
        setActivities(data.slice(0, limit));
      } catch (err) {
        toast.error('Failed to load activity feed');
        logger.error('Error fetching activities', err, { component: 'UserActivityFeed' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [limit]);

  if (isLoading) {
    return (
      <div className="w-full space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Recent Activity</h2>
      </div>

      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <div className="text-center p-8 text-muted-foreground">
          No recent activity found
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity }: { activity: UserActivity }) {
  const getActivityIcon = () => {
    switch (activity.activityType) {
      case 'donation':
        return <Gift className="h-5 w-5 text-green-500" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'request':
        return <FileText className="h-5 w-5 text-orange-500" />;
      case 'redemption':
        return <HeartHandshake className="h-5 w-5 text-purple-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-4 border rounded-md">
      <div className="flex items-start gap-3">
        <div className="bg-muted/50 p-2 rounded-full">
          {getActivityIcon()}
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="font-medium">{activity.title}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="h-5 w-5">
                  <AvatarFallback>{(activity.username ?? 'Anonymous').substring(0, 2).toUpperCase()}</AvatarFallback>
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${activity.username ?? 'Anonymous'}`} />
                </Avatar>
                <span>{activity.username}</span>
                <span>•</span>
                <span>{formatDistanceToNow(activity.createdAt, { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          <p className="mt-2 text-sm">{activity.description}</p>
        </div>
      </div>
    </div>
  );
}
