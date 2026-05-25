import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import VoucherCard from './VoucherCard';
import { Voucher } from '@/lib/types';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VoucherVirtualListProps {
  vouchers: Voucher[];
  onRedeemSuccess?: () => void;
}

export default function VoucherVirtualList({ vouchers, onRedeemSuccess }: VoucherVirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: vouchers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 350, // Estimate height of voucher card
    overscan: 5, // Number of items to render above/below visible area
  });
  
  // Update item measurements when window resizes
  useEffect(() => {
    const handleResize = () => virtualizer.measure();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [virtualizer]);
  
  const items = virtualizer.getVirtualItems();
  
  return (
    <div 
      ref={parentRef}
      className="w-full overflow-auto"
      style={{ height: 'calc(100vh - 250px)' }}
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        <div className="absolute top-0 left-0 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((virtualItem) => (
            <motion.div
              key={vouchers[virtualItem.index].id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <VoucherCard 
                voucher={vouchers[virtualItem.index]} 
                onRedeemSuccess={onRedeemSuccess} 
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 