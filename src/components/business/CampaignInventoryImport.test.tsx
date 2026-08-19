import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CampaignInventoryImport from './CampaignInventoryImport';

const csv = vi.hoisted(() => vi.fn());
const previewMutation = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
const replaceMutation = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
vi.mock('@/lib/campaign-csv', () => ({ parseCampaignCsv: csv }));
vi.mock('@/hooks/useBusinessQueries', () => ({
  usePreviewInventoryMutation: () => previewMutation,
  useReplaceInventoryMutation: () => replaceMutation,
}));

describe('CampaignInventoryImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    csv.mockResolvedValue({
      headers: ['code', 'value'],
      rows: [
        { sourceRow: 2, code: 'SAVE50', value: '₹50' },
        { sourceRow: 3, code: 'DUPLICATE', value: '₹20' },
      ],
    });
    previewMutation.mutateAsync.mockResolvedValue({
      accepted: [{ sourceRow: 2, code: 'SAVE50', value: '₹50' }],
      rejected: [{ sourceRow: 3, reason: 'duplicate code' }],
      totalRows: 2,
    });
    replaceMutation.mutateAsync.mockResolvedValue({});
  });

  it('shows rejected source rows before confirmation', async () => {
    const user = userEvent.setup();
    render(<CampaignInventoryImport campaignId="campaign-1" />);

    await user.upload(screen.getByLabelText(/inventory csv/i), new File(['code,value'], 'inventory.csv', { type: 'text/csv' }));

    expect(await screen.findByText('row 3')).toBeInTheDocument();
    expect(screen.getByText('duplicate code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'confirm 1 voucher' })).toBeEnabled();
    expect(replaceMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('confirms only accepted preview rows and notifies the workspace to refetch', async () => {
    const user = userEvent.setup();
    const onConfirmed = vi.fn();
    render(<CampaignInventoryImport campaignId="campaign-1" onConfirmed={onConfirmed} />);

    await user.upload(screen.getByLabelText(/inventory csv/i), new File(['code,value'], 'inventory.csv', { type: 'text/csv' }));
    await user.click(await screen.findByRole('button', { name: 'confirm 1 voucher' }));

    expect(replaceMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'campaign-1',
      rows: [{ sourceRow: 2, code: 'SAVE50', value: '₹50' }],
    });
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('does not preview malformed client files and keeps confirmation disabled without accepted rows', async () => {
    const user = userEvent.setup();
    csv.mockRejectedValueOnce(new Error('CSV headers must be exactly code or code,value'));
    render(<CampaignInventoryImport campaignId="campaign-1" />);

    await user.upload(screen.getByLabelText(/inventory csv/i), new File(['bad'], 'inventory.csv', { type: 'text/csv' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/headers must be exactly/i);
    expect(previewMutation.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  it('disables import controls for a locked campaign', () => {
    render(<CampaignInventoryImport campaignId="campaign-1" disabled />);

    expect(screen.getByLabelText(/inventory csv/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });
});
