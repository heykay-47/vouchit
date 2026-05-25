export type VoucherPlatform = 'Google Pay' | 'Paytm' | 'PhonePe' | 'Other';
export type VoucherCategory = 'Food' | 'Shopping' | 'Travel' | 'Entertainment' | 'Electronics' | 'Health' | 'Other';

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  redeemedVouchers: string[]; // Array of voucher IDs
  favorites?: string[]; // Array of voucher IDs
  profileImage?: string;
  bio?: string;
  notificationPreferences?: NotificationPreferences;
  reputation?: number;
}

export interface NotificationPreferences {
  email: boolean;
  newVouchers: boolean;
  voucherExpiry: boolean;
  systemUpdates: boolean;
}

export interface Voucher {
  id: string;
  platform: VoucherPlatform;
  title: string;
  description: string;
  code: string;
  imageUrl: string; // URL to the screenshot
  expiryDate?: Date;
  value?: string;
  donatedBy: string; // Could be "Anonymous" or user ID
  donatedAt: Date;
  isRedeemed: boolean;
  redeemedBy?: string; // User ID
  redeemedAt?: Date;
  reportCount: number; // Number of "not working" reports
  isActive: boolean; // False if reportCount >= 5 or manually deactivated
  category?: VoucherCategory;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  voucher_id: string;
  created_at: Date;
}

export interface UserPreference {
  id: string;
  user_id: string;
  notification_preferences: NotificationPreferences;
  created_at: Date;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile?: (data: Partial<User>) => Promise<void>;
  toggleFavorite?: (voucherId: string) => Promise<void>;
}

export interface VoucherContextType {
  vouchers: Voucher[];
  isLoading: boolean;
  error: string | null;
  donateVoucher: (voucher: Omit<Voucher, 'id' | 'donatedAt' | 'reportCount' | 'isActive'>) => Promise<void>;
  redeemVoucher: (voucherId: string) => Promise<void>;
  reportVoucher: (voucherId: string) => Promise<void>;
  favoriteVouchers?: string[];
  toggleFavorite?: (voucherId: string) => Promise<void>;
  sortVouchers?: (sortBy: 'newest' | 'expirySoon' | 'highestValue') => void;
  filteredVouchers?: Voucher[];
  setFilteredVouchers?: (vouchers: Voucher[]) => void;
  searchVouchers?: (query: string) => Voucher[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'voucher' | 'system' | 'alert';
  isRead: boolean;
  createdAt: Date;
  voucherId?: string;
}

export interface Comment {
  id: string;
  voucherId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: Date;
}

export interface VoucherRequest {
  id: string;
  userId: string;
  username: string;
  title: string;
  description: string;
  category: VoucherCategory;
  createdAt: Date;
  isActive: boolean;
  responses: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  username: string;
  activityType: 'donation' | 'comment' | 'request' | 'redemption';
  entityId: string;
  entityType: 'voucher' | 'comment' | 'request' | 'redemption';
  title: string;
  description: string;
  createdAt: Date;
}

export interface Contributor {
  id: string;
  username: string;
  profileImage?: string;
  donationCount: number;
  totalDonated: number;
}
