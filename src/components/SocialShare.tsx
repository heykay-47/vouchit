
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';
import { Share, Facebook, Twitter, Linkedin, Link, Mail } from 'lucide-react';

interface SocialShareProps {
  voucherId: string;
  voucherTitle?: string;
}

export default function SocialShare({ voucherId, voucherTitle }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  
  // Create the base URL for sharing
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/voucher/${voucherId}`;
  const shareTitle = voucherTitle ? `Check out this voucher: ${voucherTitle}` : 'Check out this voucher';
  
  // Copies voucher share link to clipboard for easy distribution
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link.');
      logger.error('Failed to copy to clipboard', err, {
        component: 'SocialShare',
        action: 'copyToClipboard',
        url: shareUrl,
      });
    }
  };
  
  // Create share URLs for different platforms
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const emailShareUrl = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`Check out this voucher: ${shareUrl}`)}`;
  
  // Open share dialog
  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Share className="h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openShareWindow(facebookShareUrl)}>
          <Facebook className="h-4 w-4 mr-2" />
          <span>Facebook</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShareWindow(twitterShareUrl)}>
          <Twitter className="h-4 w-4 mr-2" />
          <span>X (Twitter)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openShareWindow(linkedinShareUrl)}>
          <Linkedin className="h-4 w-4 mr-2" />
          <span>LinkedIn</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(emailShareUrl)}>
          <Mail className="h-4 w-4 mr-2" />
          <span>Email</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard}>
          <Link className="h-4 w-4 mr-2" />
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
