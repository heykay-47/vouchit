import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VoucherRequest, VoucherCategory } from '@/lib/types';
import { communityService } from '@/services/community.service';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from 'lucide-react';

export default function RequestSystem() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VoucherRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [requestTitle, setRequestTitle] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestCategory, setRequestCategory] = useState<VoucherCategory>('Food');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setIsLoading(true);
        const data = await communityService.listRequests();
        setRequests(data);
      } catch (err) {
        toast.error('Failed to load voucher requests.');
        logger.error('Error fetching voucher requests', err, { component: 'RequestSystem' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to make requests');
      return;
    }

    if (!requestTitle.trim() || !requestDescription.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await communityService.createRequest({
        title: requestTitle.trim(),
        description: requestDescription.trim(),
        category: requestCategory,
      });

      setRequestTitle('');
      setRequestDescription('');
      setRequestCategory('Food');
      setDialogOpen(false);

      toast.success('Voucher request submitted successfully');

      const updated = await communityService.listRequests();
      setRequests(updated);
    } catch (err) {
      toast.error('Failed to submit your request.');
      logger.error('Error submitting voucher request', err, { component: 'RequestSystem' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Voucher Requests</h3>

        {user && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a Voucher</DialogTitle>
                <DialogDescription>
                  Describe what kind of voucher you're looking for
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitRequest} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Title</label>
                  <Input
                    id="title"
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    placeholder="Grocery voucher needed"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">Category</label>
                  <Select
                    value={requestCategory}
                    onValueChange={(value) => setRequestCategory(value as VoucherCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Food">Food</SelectItem>
                      <SelectItem value="Shopping">Shopping</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Health">Health</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">Description</label>
                  <Textarea
                    id="description"
                    value={requestDescription}
                    onChange={(e) => setRequestDescription(e.target.value)}
                    placeholder="Please describe what you're looking for and why"
                    rows={4}
                    required
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!user && (
        <div className="p-4 border rounded-md bg-muted/50 text-center">
          Please log in to make voucher requests
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div>
          </div>
        ) : requests.length > 0 ? (
          requests.map(request => (
            <RequestCard key={request.id} request={request} />
          ))
        ) : (
          <div className="text-center text-muted-foreground p-8">
            No voucher requests yet
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({ request }: { request: VoucherRequest }) {
  return (
    <div className={`p-4 border rounded-md ${request.isActive ? 'bg-card' : 'bg-muted/30'}`}>
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarFallback>{request.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.username}`} />
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="font-medium">{request.title}</div>
              <div className="text-xs text-muted-foreground flex gap-2 items-center">
                <span>{request.username}</span>
                <span>•</span>
                <span>{formatDistanceToNow(request.createdAt, { addSuffix: true })}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-muted">
                {request.category}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted">
                {request.responses} {request.responses === 1 ? 'response' : 'responses'}
              </span>
              {!request.isActive && (
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  Closed
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm">{request.description}</p>
        </div>
      </div>
    </div>
  );
}
