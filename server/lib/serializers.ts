import { Favorite } from '../models/Favorite.js';
import { RedeemedVoucher } from '../models/RedeemedVoucher.js';

export const toUserResponse = async (user: any) => {
  const userId = user._id.toString();
  const [favorites, redeemedVouchers] = await Promise.all([
    Favorite.find({ userId }),
    RedeemedVoucher.find({ userId }),
  ]);

  return {
    id: userId,
    email: user.email,
    username: user.username,
    bio: user.bio ?? undefined,
    profileImage: user.profileImage ?? undefined,
    notificationPreferences: user.notificationPreferences,
    createdAt: user.createdAt,
    favorites: favorites.map((favorite: any) => favorite.voucherId.toString()),
    redeemedVouchers: redeemedVouchers.map((redeemed: any) => redeemed.voucherId.toString()),
  };
};
