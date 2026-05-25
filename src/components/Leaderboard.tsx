import { useState, useEffect } from 'react';
import { Contributor } from '@/lib/types';
import { communityService } from '@/services/community.service';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Medal, Trophy } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardProps {
  limit?: number;
}

export default function Leaderboard({ limit = 10 }: LeaderboardProps) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const data = await communityService.leaderboard();
        setContributors(data.slice(0, limit));
      } catch (err) {
        logger.error('Error fetching leaderboard', err, { component: 'Leaderboard' });
        toast.error('Failed to load leaderboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit]);

  if (isLoading) {
    return (
      <div className="w-full p-8">
        <Skeleton className="h-8 w-full mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h2 className="text-xl font-bold">Top Contributors</h2>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableCaption>Top contributors in the last 30 days</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Rank</TableHead>
              <TableHead>Contributor</TableHead>
              <TableHead className="text-right">Donations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contributors.length > 0 ? (
              contributors.map((contributor, index) => (
                <TableRow key={contributor.id}>
                  <TableCell className="font-medium">
                    <RankBadge rank={index + 1} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{contributor.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${contributor.username}`} />
                      </Avatar>
                      <span>{contributor.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{contributor.donationCount}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                  No donations in the last 30 days
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-yellow-100 text-yellow-700"><Trophy className="h-4 w-4" /></span>;
  } else if (rank === 2) {
    return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-gray-100 text-gray-700"><Medal className="h-4 w-4" /></span>;
  } else if (rank === 3) {
    return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-100 text-amber-700"><Medal className="h-4 w-4" /></span>;
  }

  return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted text-muted-foreground text-sm">{rank}</span>;
}
