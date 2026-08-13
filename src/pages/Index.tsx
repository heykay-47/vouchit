import { useState } from 'react';
import { useVouchers } from '@/contexts/VoucherContext';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import VoucherCard from '@/components/VoucherCard';
import VoucherSkeleton from '@/components/VoucherSkeleton';

function VoucherGridSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">loading vouchers</span>
      <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <VoucherSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

function VoucherLoadError({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return (
    <div role="alert" className="rounded-lg border border-border bg-card p-6">
      <h1 className="text-lg font-medium lowercase">unable to load vouchers</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-4 h-11" variant="outline" onClick={() => void onRetry()}>
        try again
      </Button>
    </div>
  );
}

export default function Index() {
  const { vouchers, isLoading, loadError, retryVouchers } = useVouchers();
  const [searchQuery, setSearchQuery] = useState('');

  const availableVouchers = vouchers.filter(v => v.isActive && !v.isRedeemed);
  const filteredVouchers = searchQuery
    ? availableVouchers.filter(v => 
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableVouchers;

  if (isLoading) return <VoucherGridSkeleton />;
  if (loadError) return <VoucherLoadError message={loadError} onRetry={retryVouchers} />;

  const resultCount = filteredVouchers.length;
  const resultCountCopy = resultCount === 1 ? '1 voucher found' : `${resultCount} vouchers found`;

  return (
    <div className="py-4">
      <header className="mb-8">
        <h1 className="mb-2 text-2xl font-medium lowercase">available vouchers</h1>
        <p className="text-muted-foreground text-sm">
          {availableVouchers.length} vouchers ready to grab
        </p>
      </header>

      <div className="mb-8 max-w-md">
        <label className="sr-only" htmlFor="voucher-search">search vouchers</label>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="voucher-search"
            type="search"
            autoComplete="off"
            placeholder="search vouchers"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-11 bg-card pl-10"
          />
        </div>
        <p role="status" aria-live="polite" className="mt-2 text-sm text-muted-foreground">
          {resultCountCopy}
        </p>
      </div>

      {availableVouchers.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">no vouchers available yet</p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">no vouchers match your search</p>
          <Button className="mt-4 h-11" variant="outline" onClick={() => setSearchQuery('')}>
            clear search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVouchers.map((voucher) => (
            <VoucherCard key={voucher.id} voucher={voucher} />
          ))}
        </div>
      )}
    </div>
  );
}
