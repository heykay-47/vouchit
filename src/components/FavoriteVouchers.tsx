import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVouchers } from '@/contexts/VoucherContext';
import { Voucher } from '@/lib/types';
import VoucherGallery from './VoucherGallery';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, BookmarkPlus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/utils/toast';

export default function FavoriteVouchers() {
  const { user, toggleFavorite } = useAuth();
  const { vouchers } = useVouchers();
  const navigate = useNavigate();
  const [favoriteVouchers, setFavoriteVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.favorites && vouchers.length > 0) {
      const favorites = vouchers.filter(voucher =>
        user.favorites?.includes(voucher.id)
      );
      setFavoriteVouchers(favorites);
    } else {
      setFavoriteVouchers([]);
    }
    setIsLoading(false);
  }, [user, vouchers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Saved Vouchers</h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i} className="h-40 animate-pulse">
              <CardContent className="flex items-center justify-center h-full">
                <div className="w-8 h-8 rounded-full bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : favoriteVouchers.length > 0 ? (
        <VoucherGallery
          title=""
          showFilters={true}
          voucherList={favoriteVouchers}
          emptyMessage="You haven't saved any vouchers yet."
        />
      ) : (
        <motion.div
          className="flex flex-col items-center justify-center py-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-muted/50 rounded-full p-6 mb-4">
            <Heart className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">No saved vouchers</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Save vouchers you like by clicking the bookmark icon on any voucher card
          </p>

          <div className="mt-8 flex flex-col md:flex-row gap-4">
            <Button
              variant="default"
              className="flex items-center gap-2"
              onClick={() => navigate('/browse')}
            >
              <Search className="h-4 w-4" />
              Browse Vouchers
            </Button>

            <Button variant="outline" className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4" />
              How to Save Vouchers
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
