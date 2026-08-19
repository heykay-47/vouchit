import { describe, expect, it } from 'vitest';
import { User } from './User.js';
import { Voucher } from './Voucher.js';
import { Favorite } from './Favorite.js';
import { ReportedVoucher } from './ReportedVoucher.js';
import { BusinessProfile } from './BusinessProfile.js';

describe('mongoose models', () => {
  it('defines core collection names', () => {
    expect(User.collection.name).toBe('users');
    expect(Voucher.collection.name).toBe('vouchers');
    expect(Favorite.collection.name).toBe('favorites');
    expect(ReportedVoucher.collection.name).toBe('reportedvouchers');
  });

  it('sets voucher defaults', () => {
    const voucher = new Voucher({
      platform: 'Google Pay',
      title: 'Test',
      description: 'Desc',
      code: 'SAVE10',
      imageUrl: 'data:image/png;base64,abc',
      donatedBy: '507f1f77bcf86cd799439011',
    });

    expect(voucher.isRedeemed).toBe(false);
    expect(voucher.reportCount).toBe(0);
    expect(voucher.isActive).toBe(true);
  });

  it('defaults new users to the customer role', () => {
    const user = new User({ email: 'legacy@example.com', username: 'legacy', passwordHash: 'hash' });
    expect(user.role).toBe('customer');
  });

  it('allows one business profile per user', () => {
    const indexes = BusinessProfile.schema.indexes();
    expect(indexes).toEqual(expect.arrayContaining([
      [{ userId: 1 }, expect.objectContaining({ unique: true })],
    ]));
  });
});
