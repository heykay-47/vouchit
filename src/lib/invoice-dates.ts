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

export const getCalendarDate = (date: Date, timeZone = localTimeZone()): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
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

  const candidate = dateValue === getCalendarDate(now, timeZone)
    ? now
    : new Date(`${dateValue}T23:59:59.999Z`);
  const validDate = issuedAt && candidate.getTime() < issuedAt.getTime() ? issuedAt : candidate;
  return validDate.toISOString();
};
