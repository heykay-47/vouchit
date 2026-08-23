import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  DEFAULT_OFFER_FILTERS,
  hasActiveOfferFilters,
  VOUCHER_CATEGORIES,
  VOUCHER_PLATFORMS,
} from '@/lib/offer-filters';
import type {
  OfferFilters as OfferFilterState,
  OfferSourceFilter,
  VoucherCategory,
  VoucherPlatform,
} from '@/lib/types';

interface OfferFiltersProps {
  filters: OfferFilterState;
  onChange: (
    filters: OfferFilterState,
    options: { replace: boolean },
  ) => void;
}

export function OfferFilters({ filters, onChange }: OfferFiltersProps) {
  const [draftSearch, setDraftSearch] = useState(filters.q);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => setDraftSearch(filters.q), [filters.q]);

  useEffect(() => {
    if (draftSearch === filters.q) return undefined;

    const timer = window.setTimeout(() => {
      onChange({ ...filtersRef.current, q: draftSearch.trim() }, { replace: true });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [draftSearch, filters.q, onChange]);

  const updateImmediately = (patch: Partial<OfferFilterState>) => {
    onChange({ ...filters, ...patch }, { replace: false });
  };

  const clearFilters = () => {
    setDraftSearch('');
    onChange(DEFAULT_OFFER_FILTERS, { replace: false });
  };

  const hasActiveFilters = hasActiveOfferFilters({
    ...filters,
    q: draftSearch.trim(),
  });

  return (
    <div
      role="group"
      aria-label="offer filters"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <Input
        type="search"
        role="searchbox"
        aria-label="search offers"
        maxLength={100}
        placeholder="search offers"
        value={draftSearch}
        onChange={(event) => setDraftSearch(event.target.value)}
        className="h-11 bg-card sm:min-w-56 sm:flex-1"
      />

      <Select
        value={filters.platform ?? 'all'}
        onValueChange={(value) => updateImmediately({
          platform: value === 'all' ? undefined : value as VoucherPlatform,
        })}
      >
        <SelectTrigger aria-label="platform" className="h-11 sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">all platforms</SelectItem>
          {VOUCHER_PLATFORMS.map((platform) => (
            <SelectItem key={platform} value={platform}>{platform.toLowerCase()}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category ?? 'all'}
        onValueChange={(value) => updateImmediately({
          category: value === 'all' ? undefined : value as VoucherCategory,
        })}
      >
        <SelectTrigger aria-label="category" className="h-11 sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">all categories</SelectItem>
          {VOUCHER_CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>{category.toLowerCase()}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.source}
        onValueChange={(value) => updateImmediately({ source: value as OfferSourceFilter })}
      >
        <SelectTrigger aria-label="source" className="h-11 sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">all sources</SelectItem>
          <SelectItem value="community">community</SelectItem>
          <SelectItem value="campaign">business campaigns</SelectItem>
        </SelectContent>
      </Select>

      <Label
        htmlFor="expiring-soon"
        data-testid="expiry-filter"
        className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md border border-input bg-background px-3 sm:justify-start"
      >
        <span className="leading-normal">expiring within 7 days</span>
        <Switch
          id="expiring-soon"
          checked={filters.expiringSoon}
          onCheckedChange={(checked) => updateImmediately({ expiringSoon: checked })}
        />
      </Label>

      {hasActiveFilters && (
        <Button type="button" variant="outline" className="h-11" onClick={clearFilters}>
          clear filters
        </Button>
      )}
    </div>
  );
}
