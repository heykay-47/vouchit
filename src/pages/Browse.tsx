import { useState } from 'react';
import { useVouchers } from '@/contexts/VoucherContext';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import VoucherCard from '@/components/VoucherCard';
import { Button } from '@/components/ui/button';

type FilterStatus = 'all' | 'available' | 'redeemed' | 'expired';

export default function Browse() {
  const { vouchers, isLoading } = useVouchers();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('available');

  const filterVouchers = () => {
    let filtered = vouchers;
    
    // Filter by status
    switch (filterStatus) {
      case 'available':
        filtered = filtered.filter(v => v.isActive && !v.isRedeemed && 
          (!v.expiryDate || new Date(v.expiryDate) >= new Date()));
        break;
      case 'redeemed':
        filtered = filtered.filter(v => v.isRedeemed);
        break;
      case 'expired':
        filtered = filtered.filter(v => v.expiryDate && new Date(v.expiryDate) < new Date());
        break;
      default:
        filtered = filtered.filter(v => v.isActive);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(query) ||
        v.platform.toLowerCase().includes(query) ||
        v.description?.toLowerCase().includes(query) ||
        v.code?.toLowerCase().includes(query) ||
        v.campaign?.brandName.toLowerCase().includes(query) ||
        v.campaign?.organizationName.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const filteredVouchers = filterVouchers();
  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'all' },
    { value: 'available', label: 'available' },
    { value: 'redeemed', label: 'redeemed' },
    { value: 'expired', label: 'expired' },
  ];

  return (
    <div className="py-4">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-medium lowercase mb-2">browse vouchers</h1>
        <p className="text-muted-foreground text-sm">
          {filteredVouchers.length} vouchers found
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        
        {/* Status Filter */}
        <div className="flex gap-1 p-1 bg-card border border-border rounded-lg">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              className={`lowercase text-xs px-3 ${
                filterStatus === option.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setFilterStatus(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Voucher Grid */}
      {isLoading ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">loading...</p>
        </div>
      ) : filteredVouchers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVouchers.map((voucher) => (
            <VoucherCard key={voucher.id} voucher={voucher} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            {searchQuery ? 'no vouchers match your search' : 'no vouchers found'}
          </p>
        </div>
      )}
    </div>
  );
}
