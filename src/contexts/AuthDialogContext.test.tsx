import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthDialogProvider, useAuthDialog } from './AuthDialogContext';

vi.mock('@/components/AuthModal', () => ({
  default: ({ isOpen, initialMode, onClose }: { isOpen: boolean; initialMode: string; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog" aria-label={initialMode}>
        <button onClick={onClose}>close auth</button>
      </div>
    ) : null,
}));

function Harness() {
  const { openLogin, openSignup } = useAuthDialog();

  return (
    <>
      <button onClick={openLogin}>open login</button>
      <button onClick={openSignup}>open signup</button>
    </>
  );
}

describe('AuthDialogProvider', () => {
  it('opens login and closes the shared dialog', async () => {
    const user = userEvent.setup();
    render(
      <AuthDialogProvider>
        <Harness />
      </AuthDialogProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'open login' }));
    expect(screen.getByRole('dialog', { name: 'login' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'close auth' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens signup in signup mode', async () => {
    const user = userEvent.setup();
    render(
      <AuthDialogProvider>
        <Harness />
      </AuthDialogProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'open signup' }));
    expect(screen.getByRole('dialog', { name: 'signup' })).toBeInTheDocument();
  });
});
