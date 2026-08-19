import { useState, useEffect, useMemo, useCallback } from 'react';
import { useVouchers } from '@/contexts/VoucherContext';
import VoucherCard from './VoucherCard';
import VoucherSkeleton from './VoucherSkeleton';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Voucher, VoucherPlatform } from '@/lib/types';
import { Filter, Search, SortAsc, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useInView } from 'react-intersection-observer';

interface VoucherGalleryProps {
  title?: string;
  showFilters?: boolean;
  initialFilterStatus?: 'all' | 'available' | 'redeemed' | 'expired';
  showSearch?: boolean;
  voucherList?: Voucher[];
  emptyMessage?: string;
  favorites?: string[];
  limit?: number;
}

type SortOption = 'newest' | 'expiringSoon' | 'highestValue';

const ITEMS_PER_PAGE = 12;

export default function VoucherGallery({
  title = "Available Vouchers",
  showFilters = true,
  initialFilterStatus = 'all',
  showSearch = true,
  voucherList,
  emptyMessage = "No vouchers found",
  limit
}: VoucherGalleryProps) {
  const { vouchers: contextVouchers, isLoading } = useVouchers();
  const vouchers = voucherList || contextVouchers;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'redeemed' | 'expired'>(initialFilterStatus);
  const [filterPlatform, setFilterPlatform] = useState<VoucherPlatform | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [filteredVouchers, setFilteredVouchers] = useState<Voucher[]>([]);
  
  // Load more items when reaching the bottom of the list
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  useEffect(() => {
    if (inView) {
      setCurrentPage(prev => prev + 1);
    }
  }, [inView]);

  // Optimized filtering and sorting with useMemo
  const processedVouchers = useMemo(() => {
    let filtered = [...vouchers];
    
    // Filter by platform
    if (filterPlatform !== 'all') {
      filtered = filtered.filter(v => v.platform === filterPlatform);
    }
    
    // Filter by status
    if (filterStatus === 'available') {
      filtered = filtered.filter(v => v.isActive && !v.isRedeemed);
    } else if (filterStatus === 'redeemed') {
      filtered = filtered.filter(v => v.isRedeemed);
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(v => v.expiryDate && new Date(v.expiryDate) < new Date());
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.title.toLowerCase().includes(query) || 
        v.description.toLowerCase().includes(query) ||
        v.code?.toLowerCase().includes(query) ||
        v.platform.toLowerCase().includes(query) ||
        v.campaign?.brandName.toLowerCase().includes(query) ||
        v.campaign?.organizationName.toLowerCase().includes(query)
      );
    }
    
    // Sort vouchers
    return filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.donatedAt).getTime() - new Date(a.donatedAt).getTime();
      } else if (sortBy === 'expiringSoon') {
        // Put vouchers with expiry dates first, sorted by closest expiry
        if (a.expiryDate && b.expiryDate) {
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        } else if (a.expiryDate) {
          return -1; // a has expiry, b doesn't
        } else if (b.expiryDate) {
          return 1; // b has expiry, a doesn't
        }
        return 0; // neither has expiry
      } else if (sortBy === 'highestValue') {
        // Extract numeric values if possible
        const aValue = a.value ? parseFloat(a.value.replace(/[^0-9.]/g, '')) : 0;
        const bValue = b.value ? parseFloat(b.value.replace(/[^0-9.]/g, '')) : 0;
        
        if (isNaN(aValue) && isNaN(bValue)) {
          return 0;
        } else if (isNaN(aValue)) {
          return 1;
        } else if (isNaN(bValue)) {
          return -1;
        }
        return bValue - aValue;
      }
      return 0;
    });
  }, [vouchers, searchQuery, filterStatus, filterPlatform, sortBy]);

  // Update filteredVouchers when processedVouchers changes
  useEffect(() => {
    setFilteredVouchers(processedVouchers);
  }, [processedVouchers]);

  // Calculate displayed vouchers based on pagination
  const displayedVouchers = useMemo(() => {
    return filteredVouchers.slice(0, currentPage * ITEMS_PER_PAGE);
  }, [filteredVouchers, currentPage]);
  
  const hasMoreItems = displayedVouchers.length < filteredVouchers.length;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
      
      {showFilters && (
        <div className="space-y-4">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vouchers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Tabs 
                defaultValue={filterStatus} 
                onValueChange={(v) => setFilterStatus(v as 'all' | 'available' | 'redeemed' | 'expired')}
                className="w-full"
              >
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="available">Available</TabsTrigger>
                  <TabsTrigger value="redeemed">Redeemed</TabsTrigger>
                  <TabsTrigger value="expired">Expired</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="w-full sm:w-auto flex flex-row gap-2">
              <Select 
                value={filterPlatform} 
                onValueChange={(v) => setFilterPlatform(v as VoucherPlatform | 'all')}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="All Platforms" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="Google Pay">Google Pay</SelectItem>
                  <SelectItem value="Paytm">Paytm</SelectItem>
                  <SelectItem value="PhonePe">PhonePe</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    <SelectValue placeholder="Sort By" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    <div className="flex items-center gap-2">
                      <span>Newest</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="expiringSoon">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Expiring Soon</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="highestValue">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Highest Value</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <VoucherSkeleton key={i} />
          ))}
        </div>
      ) : displayedVouchers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {displayedVouchers.map((voucher) => (
              <motion.div
                key={voucher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                layout
              >
                <VoucherCard voucher={voucher} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          className="flex flex-col items-center justify-center py-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-muted/50 rounded-full p-6 mb-4">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">{emptyMessage}</h3>
          <p className="text-muted-foreground mt-2">
            {searchQuery 
              ? "Try adjusting your search or filters" 
              : "Check back later for new vouchers"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
