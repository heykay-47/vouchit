const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

const assertSafePaise = (paise: number) => {
  if (!Number.isSafeInteger(paise) || paise < 0) {
    throw new Error('Amount must be a non-negative integer number of paise');
  }
};

export const parseRupeesToPaise = (value: string): number => {
  const normalized = value.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error('Enter a valid amount in rupees with up to two decimals');

  const rupees = BigInt(match[1]);
  const paise = BigInt((match[2] ?? '').padEnd(2, '0') || '0');
  const total = rupees * 100n + paise;
  if (total > MAX_SAFE_INTEGER) throw new Error('Amount is too large');
  return Number(total);
};

export const formatPaiseAsRupees = (paise: number): string => {
  assertSafePaise(paise);
  const rupees = Math.floor(paise / 100);
  const paisePart = String(paise % 100).padStart(2, '0');
  return `${rupees.toLocaleString('en-IN')}.${paisePart}`;
};

export const formatPaiseAsRupeesInput = (paise: number): string => {
  assertSafePaise(paise);
  const rupees = Math.floor(paise / 100);
  const paisePart = String(paise % 100).padStart(2, '0');
  return `${rupees}.${paisePart}`;
};

export const formatPaiseAsInr = (paise: number): string => `₹${formatPaiseAsRupees(paise)}`;
