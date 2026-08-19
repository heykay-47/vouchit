export type VoucherPlatform = 'Google Pay' | 'Paytm' | 'PhonePe' | 'Other';
export type VoucherCategory = 'Food' | 'Shopping' | 'Travel' | 'Entertainment' | 'Electronics' | 'Health' | 'Other';
export type UserRole = 'customer' | 'business';
export type VoucherSourceType = 'community' | 'campaign';

export interface CampaignVoucherAttribution {
  campaignId: string;
  brandName: string;
  organizationName: string;
}

export type CampaignStatus = 'draft' | 'awaiting_payment' | 'active' | 'completed';
export type CampaignCompletionReason = 'claimed' | 'expired';

export type SignupInput =
  | {
      role: 'customer';
      email: string;
      username: string;
      password: string;
      rememberMe?: boolean;
    }
  | {
      role: 'business';
      email: string;
      username: string;
      password: string;
      rememberMe?: boolean;
      organizationName: string;
      contactName: string;
      website?: string;
    };

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  role: UserRole;
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
  sourceType?: VoucherSourceType;
  campaign?: CampaignVoucherAttribution;
  platform: VoucherPlatform;
  title: string;
  description: string;
  code?: string;
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

export type ResolvedVoucher = Omit<Voucher, 'sourceType'> & { sourceType: VoucherSourceType };

export interface Campaign {
  id: string;
  businessId: string;
  businessProfileId: string;
  organizationName: string;
  title: string;
  brandName: string;
  description: string;
  terms: string;
  platform: VoucherPlatform;
  category: VoucherCategory;
  imageUrl: string;
  expiryDate: Date;
  status: CampaignStatus;
  effectiveStatus: CampaignStatus;
  completionReason?: CampaignCompletionReason;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignDraftInput = Pick<
  Campaign,
  'title' | 'brandName' | 'description' | 'terms' | 'platform' | 'category' | 'imageUrl'
> & { expiryDate: string };

export interface CampaignAnalytics {
  totalInventory: number;
  views: number;
  claimedBeforeExpiry: number;
  deactivated: number;
  expired: number;
  remaining: number;
  claimRate: number;
  feePerClaimPaise: number | null;
}

export interface Invoice {
  id: string;
  campaignId: string;
  businessId: string;
  priceVersion: 'v1';
  currency: 'INR';
  baseFeePaise: number;
  perVoucherFeePaise: number;
  quantity: number;
  totalPaise: number;
  status: 'issued' | 'paid';
  issuedAt: Date;
  paidAt?: Date;
  externalPaymentReference?: string;
  externalPaymentDate?: Date;
}

export interface CampaignWorkspace {
  campaign: Campaign;
  inventoryCount: number;
  invoice: Invoice | null;
  analytics: CampaignAnalytics | null;
}

export type CampaignSummary = CampaignWorkspace;

export interface CampaignInventoryCandidate {
  sourceRow: number;
  code: string;
  value?: string;
}

export interface CampaignInventoryRejection {
  sourceRow: number;
  code?: string;
  reason: string;
}

export interface CampaignInventoryPreview {
  accepted: CampaignInventoryCandidate[];
  rejected: CampaignInventoryRejection[];
  totalRows: number;
}

export interface SettlementInput {
  amountPaise: number;
  externalPaymentReference: string;
  externalPaymentDate: string;
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
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  toggleFavorite: (voucherId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface VoucherContextType {
  vouchers: Voucher[];
  isLoading: boolean;
  loadError: string | null;
  mutationError: string | null;
  retryVouchers: () => Promise<void>;
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
