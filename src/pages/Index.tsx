import { useState } from 'react';
import { useVouchers } from '@/contexts/VoucherContext';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import VoucherCard from '@/components/VoucherCard';

export default function Index() {
  const { vouchers } = useVouchers();
  const [searchQuery, setSearchQuery] = useState('');

  // Show active vouchers (not redeemed, not reported)
  const availableVouchers = vouchers.filter(v => v.isActive && !v.isRedeemed);
  
  // Filter by search
  const filteredVouchers = searchQuery
    ? availableVouchers.filter(v => 
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableVouchers;

  return (
    <div className="py-4">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-2xl font-medium lowercase mb-2">available vouchers</h1>
        <p className="text-muted-foreground text-sm">
          {availableVouchers.length} vouchers ready to grab
        </p>
      </header>

      {/* Search */}
      <div className="max-w-md mx-auto mb-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="search vouchers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
      </div>

      {/* Voucher Grid */}
      {filteredVouchers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVouchers.map((voucher) => (
            <VoucherCard key={voucher.id} voucher={voucher} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            {searchQuery ? 'no vouchers match your search' : 'no vouchers available yet'}
          </p>
        </div>
      )}
    </div>
  );
}
