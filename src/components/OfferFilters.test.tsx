import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OFFER_FILTERS } from '@/lib/offer-filters';
import { OfferFilters } from './OfferFilters';

beforeEach(() => {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OfferFilters', () => {
  it('renders exact accessible labels and every supported option', async () => {
    const user = userEvent.setup();
    render(<OfferFilters filters={DEFAULT_OFFER_FILTERS} onChange={vi.fn()} />);

    expect(screen.getByRole('searchbox', { name: 'search offers' })).toHaveAttribute('maxlength', '100');
    expect(screen.getByRole('switch', { name: 'expiring within 7 days' })).not.toBeChecked();

    const optionSets = [
      ['platform', ['all platforms', 'google pay', 'paytm', 'phonepe', 'other']],
      ['category', ['all categories', 'food', 'shopping', 'travel', 'entertainment', 'electronics', 'health', 'other']],
      ['source', ['all sources', 'community', 'business campaigns']],
    ] as const;

    for (const [label, options] of optionSets) {
      await user.click(screen.getByRole('combobox', { name: label }));
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(options);
      await user.keyboard('{Escape}');
    }
  });

  it('debounces search for 300ms but applies expiry immediately', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<OfferFilters filters={DEFAULT_OFFER_FILTERS} onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'search offers' }), {
      target: { value: 'coffee' },
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(299));
    expect(onChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledWith(
      { ...DEFAULT_OFFER_FILTERS, q: 'coffee' },
      { replace: true },
    );

    fireEvent.click(screen.getByRole('switch', { name: 'expiring within 7 days' }));
    expect(onChange).toHaveBeenCalledWith(
      { ...DEFAULT_OFFER_FILTERS, expiringSoon: true },
      { replace: false },
    );
  });

  it('applies platform, category, and source controls immediately', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<OfferFilters filters={DEFAULT_OFFER_FILTERS} onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: 'platform' }));
    await user.click(screen.getByRole('option', { name: 'google pay' }));
    expect(onChange).toHaveBeenLastCalledWith(
      { ...DEFAULT_OFFER_FILTERS, platform: 'Google Pay' },
      { replace: false },
    );

    await user.click(screen.getByRole('combobox', { name: 'category' }));
    await user.click(screen.getByRole('option', { name: 'travel' }));
    expect(onChange).toHaveBeenLastCalledWith(
      { ...DEFAULT_OFFER_FILTERS, category: 'Travel' },
      { replace: false },
    );

    await user.click(screen.getByRole('combobox', { name: 'source' }));
    await user.click(screen.getByRole('option', { name: 'business campaigns' }));
    expect(onChange).toHaveBeenLastCalledWith(
      { ...DEFAULT_OFFER_FILTERS, source: 'campaign' },
      { replace: false },
    );
  });

  it('synchronizes browser navigation and cancels the stale search timer', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const view = render(<OfferFilters filters={DEFAULT_OFFER_FILTERS} onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'search offers' }), {
      target: { value: 'stale' },
    });
    view.rerender(
      <OfferFilters
        filters={{ ...DEFAULT_OFFER_FILTERS, q: 'restored' }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'search offers' })).toHaveValue('restored');
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears every filter immediately', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <OfferFilters
        filters={{
          q: 'coffee',
          platform: 'Paytm',
          category: 'Food',
          source: 'community',
          expiringSoon: true,
        }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'clear filters' }));

    expect(onChange).toHaveBeenCalledWith(DEFAULT_OFFER_FILTERS, { replace: false });
  });

  it('clears a pending search without letting its debounce restore the query', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<OfferFilters filters={DEFAULT_OFFER_FILTERS} onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'search offers' }), {
      target: { value: 'pending' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'clear filters' }));
    act(() => vi.advanceTimersByTime(300));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(DEFAULT_OFFER_FILTERS, { replace: false });
  });

  it('stacks and wraps controls with at least 44px standalone targets', () => {
    render(
      <OfferFilters
        filters={{ ...DEFAULT_OFFER_FILTERS, q: 'active' }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('group', { name: 'offer filters' })).toHaveClass(
      'flex-col',
      'sm:flex-row',
      'sm:flex-wrap',
    );
    expect(screen.getByRole('searchbox', { name: 'search offers' })).toHaveClass('h-11');
    for (const label of ['platform', 'category', 'source']) {
      expect(screen.getByRole('combobox', { name: label })).toHaveClass('h-11');
    }
    expect(screen.getByTestId('expiry-filter')).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'clear filters' })).toHaveClass('h-11');
  });
});
