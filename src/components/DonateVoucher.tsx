import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { VoucherPlatform } from '@/lib/types';
import { useVouchers } from '@/contexts/VoucherContext';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImage } from '@/services/upload';
import { CalendarIcon, Upload, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';

export default function DonateVoucher() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<VoucherPlatform | ''>('');
  const [code, setCode] = useState('');
  const [value, setValue] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { donateVoucher } = useVouchers();
  const { isAuthenticated, user } = useAuth();
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(selectedFile.type)) {
        toast.error('invalid file type');
        return;
      }

      const maxSizeInBytes = 3 * 1024 * 1024;
      if (selectedFile.size > maxSizeInBytes) {
        toast.error('file too large (max 3mb)');
        return;
      }

      setImage(selectedFile);
      setImagePreviewUrl(URL.createObjectURL(selectedFile));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !platform || !code.trim() || !image) {
      toast.error('please fill required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const imageUrl = await uploadImage(image);
      await donateVoucher({
        platform: platform as VoucherPlatform,
        title: title.trim(),
        description: description.trim(),
        code: code.trim(),
        imageUrl,
        expiryDate,
        value: value.trim() || undefined,
        donatedBy: isAuthenticated ? user!.id : 'Anonymous',
        isRedeemed: false
      });
      
      setTitle('');
      setDescription('');
      setPlatform('');
      setCode('');
      setValue('');
      setExpiryDate(undefined);
      setImage(null);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
      
      toast.success('voucher donated!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'failed to donate voucher');
      logger.error('Error donating voucher', error, {
        component: 'DonateVoucher',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm lowercase">title *</Label>
        <Input
          id="title"
          placeholder="e.g., 50% off first order"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-card border-border"
          required
        />
      </div>
      
      {/* Platform & Code */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="platform" className="text-sm lowercase">platform *</Label>
          <Select value={platform} onValueChange={(value) => setPlatform(value as VoucherPlatform)}>
            <SelectTrigger id="platform" className="bg-card border-border">
              <SelectValue placeholder="select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Google Pay">google pay</SelectItem>
              <SelectItem value="Paytm">paytm</SelectItem>
              <SelectItem value="PhonePe">phonepe</SelectItem>
              <SelectItem value="Other">other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="code" className="text-sm lowercase">code *</Label>
          <Input
            id="code"
            placeholder="e.g., WELCOME50"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-card border-border font-mono"
            required
          />
        </div>
      </div>
      
      {/* Value & Expiry */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value" className="text-sm lowercase">value</Label>
          <Input
            id="value"
            placeholder="e.g., ₹100"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="bg-card border-border"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm lowercase">expiry</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-card border-border",
                  !expiryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiryDate ? format(expiryDate, "MMM d") : "select"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={expiryDate}
                onSelect={setExpiryDate}
                initialFocus
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm lowercase">description</Label>
        <Textarea
          id="description"
          placeholder="any conditions or notes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-card border-border min-h-20 resize-none"
        />
      </div>
      
      {/* Screenshot */}
      <div className="space-y-2">
        <Label className="text-sm lowercase">screenshot *</Label>
        <div className="border border-dashed border-border rounded-lg p-4">
          {imagePreviewUrl ? (
            <div className="relative">
              <img
                src={imagePreviewUrl}
                alt="preview"
                className="max-h-48 mx-auto object-contain rounded"
              />
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setImagePreviewUrl(null);
                }}
                className="absolute top-2 right-2 p-1 bg-card rounded-full border border-border hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3 lowercase">
                upload voucher screenshot
              </p>
              <Input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="lowercase"
                onClick={() => document.getElementById('screenshot')?.click()}
              >
                select image
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Submit */}
      <Button 
        type="submit" 
        className="w-full lowercase"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'donating...' : 'donate voucher'}
      </Button>
    </form>
  );
}
