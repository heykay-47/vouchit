import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Comment } from '@/lib/types';
import { communityService } from '@/services/community.service';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Send } from 'lucide-react';

interface CommentSystemProps {
  voucherId: string;
}

export default function CommentSystem({ voucherId }: CommentSystemProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsFetching(true);
        const comments = await communityService.listComments(voucherId);
        setComments(comments);
      } catch (err) {
        toast.error('Failed to load comments');
        logger.error('Error fetching comments', err, { component: 'CommentSystem', voucherId });
      } finally {
        setIsFetching(false);
      }
    };

    fetchComments();
  }, [voucherId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to comment');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsLoading(true);

    try {
      const { comment } = await communityService.addComment(voucherId, newComment.trim());
      setComments((prev) => [...prev, comment as Comment]);
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (err) {
      toast.error('Failed to add comment');
      logger.error('Error adding comment', err, { component: 'CommentSystem', voucherId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Comments</h3>

      {user && (
        <form onSubmit={handleSubmitComment} className="space-y-4">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px]"
          />
          <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {isLoading ? 'Posting...' : 'Post Comment'}
          </Button>
        </form>
      )}

      {!user && (
        <div className="p-4 border rounded-md bg-muted/50 text-center">
          Please log in to add comments
        </div>
      )}

      <div className="space-y-4">
        {isFetching ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div>
          </div>
        ) : comments.length > 0 ? (
          comments.map(comment => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="text-center text-muted-foreground p-4">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
}

function CommentCard({ comment }: { comment: Comment }) {
  return (
    <div className="p-4 border rounded-md">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarFallback>{comment.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment.username}`} />
        </Avatar>
        <div className="flex-1">
          <div className="flex justify-between">
            <div className="font-medium">{comment.username}</div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </div>
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap">{comment.text}</p>
        </div>
      </div>
    </div>
  );
}
