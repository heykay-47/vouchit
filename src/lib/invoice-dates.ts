export const formatInvoiceDate = (date: Date): string => date.toLocaleDateString('en-IN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export const formatInvoiceDateTime = (date: Date): string => date.toLocaleString('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const dateTimeParts = (date: Date, timeZone: string) => new Intl.DateTimeFormat('en-US', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
}).formatToParts(date).reduce<Record<string, string>>((result, part) => {
  if (part.type !== 'literal') result[part.type] = part.value;
  return result;
}, {});

export const getCalendarDate = (date: Date, timeZone = localTimeZone()): string => {
  const parts = dateTimeParts(date, timeZone);

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const localEndOfDay = (dateValue: string, timeZone: string): Date => {
  const localWallClock = new Date(`${dateValue}T23:59:59.999Z`);
  let candidate = localWallClock;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = dateTimeParts(candidate, timeZone);
    const wallClockAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
      candidate.getUTCMilliseconds(),
    );
    candidate = new Date(localWallClock.getTime() - (wallClockAsUtc - candidate.getTime()));
  }

  return candidate;
};

export const toSettlementDateTime = (
  dateValue: string,
  now = new Date(),
  issuedAt?: Date,
  timeZone = localTimeZone(),
): string => {
  const selectedDate = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(selectedDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw new Error('payment date is invalid');
  }

  const today = getCalendarDate(now, timeZone);
  const isToday = dateValue === today;
  if (dateValue > today) {
    throw new Error('payment date cannot be in the future');
  }

  const candidate = isToday ? now : localEndOfDay(dateValue, timeZone);
  if (candidate.getTime() > now.getTime()) {
    throw new Error('payment date cannot be in the future');
  }
  if (issuedAt && candidate.getTime() < issuedAt.getTime()) {
    if (isToday && issuedAt.getTime() <= now.getTime()) return issuedAt.toISOString();
    throw new Error('payment date must be on or after invoice issue');
  }

  return candidate.toISOString();
};
