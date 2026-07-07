
import { User, Voucher } from '@/lib/types';
import { useVouchers } from '@/contexts/VoucherContext';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Gift, 
  Clock, 
  Check, 
  AlertTriangle,
  Trophy,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';

interface UserStatisticsProps {
  user: User | null;
  donatedCount: number;
  redeemedCount: number;
}

export default function UserStatistics({ user, donatedCount, redeemedCount }: UserStatisticsProps) {
  const { vouchers } = useVouchers();
  
  // Validate voucher data
  if (!Array.isArray(vouchers)) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Voucher data is missing or invalid. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Calculate activity periods (last 30 days by week)
  const today = new Date();
  const activityPeriods = Array.from({ length: 4 }, (_, i) => {
    const start = addDays(today, -28 + i * 7);
    const end = addDays(start, 6);
    return {
      period: `Week ${i + 1}`,
      donated: vouchers.filter(v => 
        v.donatedBy === user?.id && 
        new Date(v.donatedAt) >= start && 
        new Date(v.donatedAt) <= end
      ).length,
      redeemed: vouchers.filter(v => 
        v.redeemedBy === user?.id && 
        v.redeemedAt && 
        new Date(v.redeemedAt) >= start && 
        new Date(v.redeemedAt) <= end
      ).length,
    };
  });
  
  // Active vs expired/redeemed vouchers pie chart
  const donatedVouchers = vouchers.filter(v => v.donatedBy === user?.id);
  const activeVouchers = donatedVouchers.filter(v => v.isActive && !v.isRedeemed);
  const inactiveVouchers = donatedVouchers.filter(v => !v.isActive || v.isRedeemed);
  
  const pieData = [
    { name: 'Active', value: activeVouchers.length, color: '#10b981' },
    { name: 'Inactive', value: inactiveVouchers.length, color: '#6b7280' },
  ];
  
  // Calculate reputation level based on donated vouchers
  let reputationLevel = 'Bronze';
  let reputationColor = 'text-orange-600';
  
  if (donatedCount >= 25) {
    reputationLevel = 'Diamond';
    reputationColor = 'text-blue-400';
  } else if (donatedCount >= 15) {
    reputationLevel = 'Platinum';
    reputationColor = 'text-gray-400';
  } else if (donatedCount >= 5) {
    reputationLevel = 'Gold';
    reputationColor = 'text-yellow-400';
  } else if (donatedCount >= 1) {
    reputationLevel = 'Silver';
    reputationColor = 'text-gray-300';
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Your Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Donated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Gift className="h-5 w-5 text-primary mr-2" />
                <div className="text-2xl font-bold">{donatedCount}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Redeemed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-voucher-cyan mr-2" />
                <div className="text-2xl font-bold">{redeemedCount}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Vouchers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-accent mr-2" />
                <div className="text-2xl font-bold">{activeVouchers.length}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reputation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Trophy className={`h-5 w-5 ${reputationColor} mr-2`} />
                <div className={`text-2xl font-bold ${reputationColor}`}>{reputationLevel}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Voucher Activity</CardTitle>
            <CardDescription>Your activity over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityPeriods}>
                  <XAxis dataKey="period" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="donated" name="Donated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="redeemed" name="Redeemed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Voucher Status</CardTitle>
            <CardDescription>Status of your donated vouchers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex justify-center">
              {donatedVouchers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No donated vouchers to display
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
