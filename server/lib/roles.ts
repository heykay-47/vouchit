export type UserRole = 'customer' | 'business';

export const resolveUserRole = (value: unknown): UserRole => (
  value === 'business' ? 'business' : 'customer'
);
