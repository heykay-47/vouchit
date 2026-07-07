
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Voucher } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDistance } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarDays, 
  Tag, 
  AlertTriangle,
  User,
  Copy,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';
import CommentSystem from './CommentSystem';
import SocialShare from './SocialShare';

interface VoucherDetailProps {
  voucher: Voucher;
  onRedeem?: () => void;
  onReport?: () => void;
}

export default function VoucherDetail({ voucher, onRedeem, onReport }: VoucherDetailProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  
  const copyCode = () => {
    if (!voucher.code) {
      toast.error('Code not available');
      return;
    }
    navigator.clipboard.writeText(voucher.code)
      .then(() => {
        toast.success('Voucher code copied to clipboard!');
      })
      .catch(err => {
        toast.error('Failed to copy code.');
        logger.error('Failed to copy voucher code', err, {
          component: 'VoucherDetail',
          action: 'copyCode',
          voucherId: voucher.id,
        });
      });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{voucher.title}</CardTitle>
            <CardDescription>
              {voucher.platform} voucher
              {voucher.value && <span> • Worth {voucher.value}</span>}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <SocialShare voucherId={voucher.id} voucherTitle={voucher.title} />
            {voucher.category && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {voucher.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voucher Image - Only show to authenticated users (may contain code) */}
        <div className="aspect-video bg-muted rounded-md overflow-hidden relative">
          {user ? (
            <img 
              src={voucher.imageUrl} 
              alt={voucher.title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 backdrop-blur-sm">
              <User className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center px-4">
                Sign in to view voucher image
              </p>
            </div>
          )}
        </div>

        <div className="text-sm">{voucher.description}</div>
        
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>Donated by {voucher.donatedBy === 'Anonymous' ? 'Anonymous' : 'a user'}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            <span>Added {formatDistance(new Date(voucher.donatedAt), new Date(), { addSuffix: true })}</span>
          </div>
          {voucher.expiryDate && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Expires {formatDistance(new Date(voucher.expiryDate), new Date(), { addSuffix: true })}</span>
            </div>
          )}
        </div>
        
        {/* Voucher Code - Only show to authenticated users */}
        {user ? (
          voucher.code ? (
            <div className="p-3 border rounded-md bg-muted/30 flex justify-between items-center">
              <div className="font-mono text-sm">{voucher.code}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyCode}
                className="flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="p-4 border rounded-md bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Redeem this voucher to view the code
              </p>
              <Badge variant="outline" className="font-mono">
                ••••••••••••
              </Badge>
            </div>
          )
        ) : (
          <div className="p-4 border rounded-md bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Sign in to view the voucher code
            </p>
            <Badge variant="outline" className="font-mono">
              ••••••••••••
            </Badge>
          </div>
        )}
        
        <Tabs defaultValue="comments">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="comments" className="pt-4">
            <CommentSystem voucherId={voucher.id} />
          </TabsContent>
          
          <TabsContent value="details" className="pt-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold">How to use this voucher</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Copy the voucher code and apply it during checkout on {voucher.platform}.
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold">Status</h4>
                <div className="flex items-center gap-2 mt-1">
                  {voucher.isRedeemed ? (
                    <Badge variant="destructive">Redeemed</Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-600">Available</Badge>
                  )}
                  
                  {voucher.reportCount > 0 && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500">
                      {voucher.reportCount} {voucher.reportCount === 1 ? 'report' : 'reports'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {!voucher.isRedeemed && user && user.id !== voucher.donatedBy && (
          <Button
            onClick={onRedeem}
            disabled={!onRedeem || voucher.isRedeemed}
          >
            Redeem Voucher
          </Button>
        )}
        
        {!voucher.isRedeemed && !user && (
          <Button variant="outline" disabled>
            Log in to redeem
          </Button>
        )}
        
        {voucher.isRedeemed && (
          <Button variant="outline" disabled>
            Already redeemed
          </Button>
        )}
        
        {user && (
          <Button 
            variant="outline" 
            onClick={onReport}
            disabled={!onReport}
          >
            Report Issue
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
