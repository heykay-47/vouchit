
import { Voucher } from '@/lib/types';

// Advanced sorting function
export const sortVouchers = (vouchers: Voucher[], sortBy: 'newest' | 'expirySoon' | 'highestValue'): Voucher[] => {
  const sorted = [...vouchers];
  
  switch (sortBy) {
    case 'newest':
      sorted.sort((a, b) => b.donatedAt.getTime() - a.donatedAt.getTime());
      break;
    case 'expirySoon':
      // Put vouchers with expiry dates first, sorted by closest to expiry
      sorted.sort((a, b) => {
        if (a.expiryDate && b.expiryDate) {
          return a.expiryDate.getTime() - b.expiryDate.getTime();
        } else if (a.expiryDate) {
          return -1; // a has expiry, b doesn't
        } else if (b.expiryDate) {
          return 1; // b has expiry, a doesn't
        } else {
          return b.donatedAt.getTime() - a.donatedAt.getTime(); // neither has expiry, sort by newest
        }
      });
      break;
    case 'highestValue':
      // Sort by value, handling non-numeric values
      sorted.sort((a, b) => {
        if (!a.value && !b.value) return 0;
        if (!a.value) return 1;
        if (!b.value) return -1;
        
        // Extract numbers from the values
        const aMatch = a.value.match(/\d+/);
        const bMatch = b.value.match(/\d+/);
        
        if (!aMatch && !bMatch) return 0;
        if (!aMatch) return 1;
        if (!bMatch) return -1;
        
        return parseInt(bMatch[0]) - parseInt(aMatch[0]);
      });
      break;
    default:
      break;
  }
  
  return sorted;
};

// Advanced search function
export const searchVouchers = (vouchers: Voucher[], query: string): Voucher[] => {
  if (!query.trim()) {
    return vouchers;
  }
  
  const lowerQuery = query.toLowerCase();
  return vouchers.filter(voucher => 
    voucher.title.toLowerCase().includes(lowerQuery) ||
    voucher.description.toLowerCase().includes(lowerQuery) ||
    voucher.platform.toLowerCase().includes(lowerQuery) ||
    (voucher.category && voucher.category.toLowerCase().includes(lowerQuery))
  );
};
