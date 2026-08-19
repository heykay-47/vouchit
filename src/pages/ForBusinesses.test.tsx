import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ForBusinesses from './ForBusinesses';

const openSignup = vi.fn();

vi.mock('@/contexts/AuthDialogContext', () => ({
  useAuthDialog: () => ({ openSignup }),
}));

function renderPage() {
  return render(
    <BrowserRouter>
      <ForBusinesses />
    </BrowserRouter>,
  );
}

describe('ForBusinesses', () => {
  beforeEach(() => {
    openSignup.mockReset();
  });

  it('explains the campaign workflow and exact prototype pricing', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'for businesses' })).toBeInTheDocument();
    expect(screen.getByText(/create a campaign/i)).toBeInTheDocument();
    expect(screen.getByText(/validate your csv inventory/i)).toBeInTheDocument();
    expect(screen.getByText(/receive an invoice/i)).toBeInTheDocument();
    expect(screen.getByText(/record external settlement/i)).toBeInTheDocument();
    expect(screen.getByText(/publish only after settlement is recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/observe aggregate views and claims before expiry/i)).toBeInTheDocument();
    expect(screen.getByText(/₹99 \+ ₹2 per voucher/i)).toBeInTheDocument();
  });

  it('opens business-preselected signup from the business CTA', async () => {
    const user = userEvent.setup();
    renderPage();

    const button = screen.getByRole('button', { name: 'create business account' });
    await user.click(button);

    expect(openSignup).toHaveBeenCalledWith(button, undefined, 'business');
  });

  it('uses factual prototype language without fabricated social proof or payment claims', () => {
    renderPage();

    expect(document.body).not.toHaveTextContent(/payment processed|verified businesses|guaranteed reach|merchant partners|production customers|direct swaps|no monetization/i);
  });
});
