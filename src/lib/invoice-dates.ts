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

export const toSettlementDateTime = (dateValue: string, now = new Date()): string => {
  const selectedDate = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(selectedDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw new Error('payment date is invalid');
  }

  if (dateValue === now.toISOString().slice(0, 10)) return now.toISOString();
  return new Date(`${dateValue}T23:59:59.999Z`).toISOString();
};
