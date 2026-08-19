import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignDraftInput } from '@/lib/types';
import CampaignDetailsForm from './CampaignDetailsForm';

const uploadImage = vi.hoisted(() => vi.fn());
vi.mock('@/services/upload', () => ({ uploadImage }));

const initialValues: CampaignDraftInput = {
  title: 'Save on groceries',
  brandName: 'Fresh Market',
  description: 'A grocery offer',
  terms: 'One use per customer',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/offer.png',
  expiryDate: '2026-09-01T00:00:00.000Z',
};

describe('CampaignDetailsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadImage.mockResolvedValue('https://cdn.example.com/new-offer.png');
  });

  it('marks every campaign draft field as required', () => {
    render(<CampaignDetailsForm onSubmit={vi.fn()} />);

    for (const label of ['title', 'brand name', 'description', 'terms', 'platform', 'category', 'expiry date', 'campaign image']) {
      expect(screen.getByLabelText(new RegExp(label, 'i'))).toBeRequired();
    }
  });

  it('uploads a supported image before submitting the campaign image URL', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CampaignDetailsForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/title/i), initialValues.title);
    await user.type(screen.getByLabelText(/brand name/i), initialValues.brandName);
    await user.type(screen.getByLabelText(/description/i), initialValues.description);
    await user.type(screen.getByLabelText(/terms/i), initialValues.terms);
    await user.selectOptions(screen.getByLabelText(/platform/i), initialValues.platform);
    await user.selectOptions(screen.getByLabelText(/category/i), initialValues.category);
    fireEvent.change(screen.getByLabelText(/expiry date/i), { target: { value: '2026-09-01' } });
    await user.upload(screen.getByLabelText(/campaign image/i), new File(['image'], 'offer.png', { type: 'image/png' }));
    fireEvent.submit(screen.getByRole('button', { name: /save campaign details/i }).closest('form')!);

    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/png' })));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      title: initialValues.title,
      imageUrl: 'https://cdn.example.com/new-offer.png',
    }));
  });

  it('rejects unsupported and oversized images before upload', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<CampaignDetailsForm onSubmit={vi.fn()} />);

    await user.upload(screen.getByLabelText(/campaign image/i), new File(['text'], 'offer.txt', { type: 'text/plain' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/jpeg, png, gif, or webp/i);
    expect(uploadImage).not.toHaveBeenCalled();

    const oversized = new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/campaign image/i), oversized);
    expect(screen.getByRole('alert')).toHaveTextContent(/3mb/i);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('renders existing draft values as locked read-only controls', () => {
    render(<CampaignDetailsForm initialValues={initialValues} disabled onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/title/i)).toHaveValue(initialValues.title);
    expect(screen.getByLabelText(/title/i)).toBeDisabled();
    expect(screen.getByLabelText(/campaign image/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /save campaign details/i })).toBeDisabled();
  });
});
