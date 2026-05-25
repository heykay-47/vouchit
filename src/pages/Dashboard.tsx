import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVouchers } from '@/contexts/VoucherContext';
import { Button } from '@/components/ui/button';
import { Gift, Heart, Bell } from 'lucide-react';
import UserStatistics from '@/components/UserStatistics';
import FavoriteVouchers from '@/components/FavoriteVouchers';
import UserNotifications from '@/components/UserNotifications';
import VoucherCard from '@/components/VoucherCard';

type Tab = 'stats' | 'donated' | 'redeemed' | 'favorites' | 'notifications';

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { vouchers, isLoading: vouchersLoading } = useVouchers();
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  
  const { donatedVouchers, redeemedVouchers } = useMemo(() => {
    const donated = vouchers.filter(voucher => voucher.donatedBy === user?.id);
    const redeemed = vouchers.filter(voucher => voucher.isRedeemed && voucher.redeemedBy === user?.id);
    return { donatedVouchers: donated, redeemedVouchers: redeemed };
  }, [vouchers, user?.id]);
  
  const isLoading = authLoading || vouchersLoading;

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const tabs: { id: Tab; label: string; icon?: React.ReactNode }[] = [
    { id: 'stats', label: 'stats', icon: <Gift className="h-4 w-4" /> },
    { id: 'donated', label: `donated (${donatedVouchers.length})` },
    { id: 'redeemed', label: `redeemed (${redeemedVouchers.length})` },
    { id: 'favorites', label: 'favorites', icon: <Heart className="h-4 w-4" /> },
    { id: 'notifications', label: 'notifications', icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <div className="py-4">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-medium lowercase mb-2">dashboard</h1>
        <p className="text-muted-foreground text-sm">
          welcome back, {user?.username?.toLowerCase() || 'user'}
        </p>
      </header>

      {isLoading ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">loading...</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-card border border-border rounded-lg mb-8">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                className={`lowercase text-xs px-3 flex items-center gap-1.5 ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'stats' && (
            <UserStatistics 
              donatedCount={donatedVouchers.length} 
              redeemedCount={redeemedVouchers.length}
              user={user}
            />
          )}

          {activeTab === 'donated' && (
            <div>
              <h2 className="text-lg font-medium lowercase mb-4">your donated vouchers</h2>
              {donatedVouchers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {donatedVouchers.map((voucher) => (
                    <VoucherCard key={voucher.id} voucher={voucher} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  you haven't donated any vouchers yet
                </p>
              )}
            </div>
          )}

          {activeTab === 'redeemed' && (
            <div>
              <h2 className="text-lg font-medium lowercase mb-4">your redeemed vouchers</h2>
              {redeemedVouchers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {redeemedVouchers.map((voucher) => (
                    <VoucherCard key={voucher.id} voucher={voucher} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  you haven't redeemed any vouchers yet
                </p>
              )}
            </div>
          )}

          {activeTab === 'favorites' && <FavoriteVouchers />}
          
          {activeTab === 'notifications' && <UserNotifications />}
        </>
      )}
    </div>
  );
}
