import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { uploadImage } from '@/services/upload';
import type { CampaignDraftInput, VoucherCategory, VoucherPlatform } from '@/lib/types';

const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const categories: VoucherCategory[] = ['Food', 'Shopping', 'Travel', 'Entertainment', 'Electronics', 'Health', 'Other'];
const platforms: VoucherPlatform[] = ['Google Pay', 'Paytm', 'PhonePe', 'Other'];

interface CampaignDetailsFormProps {
  initialValues?: Partial<CampaignDraftInput>;
  disabled?: boolean;
  isSubmitting?: boolean;
  onSubmit: (input: CampaignDraftInput) => Promise<void> | void;
}

const dateInputValue = (value?: string) => value ? value.slice(0, 10) : '';

export default function CampaignDetailsForm({
  initialValues,
  disabled = false,
  isSubmitting = false,
  onSubmit,
}: CampaignDetailsFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [brandName, setBrandName] = useState(initialValues?.brandName ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [terms, setTerms] = useState(initialValues?.terms ?? '');
  const [platform, setPlatform] = useState<VoucherPlatform | ''>(initialValues?.platform ?? '');
  const [category, setCategory] = useState<VoucherCategory | ''>(initialValues?.category ?? '');
  const [expiryDate, setExpiryDate] = useState(dateInputValue(initialValues?.expiryDate));
  const [imageUrl] = useState(initialValues?.imageUrl ?? '');
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (file: File | undefined) => {
    if (!file) return;
    if (!imageTypes.includes(file.type)) {
      setImage(null);
      setError('campaign image must be JPEG, PNG, GIF, or WebP');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setImage(null);
      setError('campaign image must be under 3MB');
      return;
    }
    setError(null);
    setImage(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!expiryDate || (!imageUrl && !image)) {
      setError(!expiryDate ? 'expiry date is required' : 'campaign image is required');
      return;
    }

    try {
      const uploadedImageUrl = image ? await uploadImage(image) : imageUrl;
      await onSubmit({
        title: title.trim(),
        brandName: brandName.trim(),
        description: description.trim(),
        terms: terms.trim(),
        platform: platform as VoucherPlatform,
        category: category as VoucherCategory,
        imageUrl: uploadedImageUrl,
        expiryDate: new Date(`${expiryDate}T23:59:59.000Z`).toISOString(),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'unable to save campaign details');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
      {error ? <p role="alert" className="break-words rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="campaign-title">title *</Label>
          <Input id="campaign-title" value={title} onChange={(event) => setTitle(event.target.value)} required disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-brand-name">brand name *</Label>
          <Input id="campaign-brand-name" value={brandName} onChange={(event) => setBrandName(event.target.value)} required disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-platform">platform *</Label>
          <select id="campaign-platform" value={platform} onChange={(event) => setPlatform(event.target.value as VoucherPlatform)} required disabled={disabled} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">select platform</option>
            {platforms.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-category">category *</Label>
          <select id="campaign-category" value={category} onChange={(event) => setCategory(event.target.value as VoucherCategory)} required disabled={disabled} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">select category</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-expiry-date">expiry date *</Label>
          <Input id="campaign-expiry-date" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} required disabled={disabled} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="campaign-description">description *</Label>
          <Textarea id="campaign-description" value={description} onChange={(event) => setDescription(event.target.value)} required disabled={disabled} className="min-h-24" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="campaign-terms">terms *</Label>
          <Textarea id="campaign-terms" value={terms} onChange={(event) => setTerms(event.target.value)} required disabled={disabled} className="min-h-24" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="campaign-image">campaign image *</Label>
          <Input id="campaign-image" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => handleImageChange(event.target.files?.[0])} required={!imageUrl} disabled={disabled} />
          {imageUrl ? <p className="break-all text-xs text-muted-foreground">current image: {imageUrl}</p> : null}
        </div>
      </div>
      <Button type="submit" disabled={disabled || isSubmitting} className="w-full lowercase sm:w-auto">
        {isSubmitting ? 'saving...' : 'save campaign details'}
      </Button>
    </form>
  );
}
