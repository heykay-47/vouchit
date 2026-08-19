import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/types';
import { AuthDialogProvider, useAuthDialog } from './AuthDialogContext';

vi.mock('@/components/AuthModal', () => ({
  default: ({
    isOpen,
    initialMode,
    initialRole,
    onClose,
    onAuthenticated,
  }: {
    isOpen: boolean;
    initialMode: string;
    initialRole: string;
    onClose: () => void;
    onAuthenticated?: (user: User) => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={initialMode} data-initial-role={initialRole}>
        <button
          onClick={() => onAuthenticated?.({
            id: 'business-user',
            email: 'ops@example.com',
            username: 'ops',
            createdAt: new Date('2026-08-19T12:00:00.000Z'),
            role: 'business',
            redeemedVouchers: [],
          })}
        >
          complete auth
        </button>
        <button onClick={onClose}>close auth</button>
      </div>
    ) : null,
}));

function Harness({ onAuthenticated }: { onAuthenticated?: (user: User) => void }) {
  const { openLogin, openSignup } = useAuthDialog();

  return (
    <>
      <button onClick={() => openLogin(undefined, onAuthenticated)}>open login</button>
      <button onClick={() => openSignup()}>open signup</button>
      <button onClick={() => openSignup(undefined, onAuthenticated, 'business')}>open business signup</button>
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

  it('passes the initial business role and authenticated user to the continuation', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    render(
      <AuthDialogProvider>
        <Harness onAuthenticated={onAuthenticated} />
      </AuthDialogProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'open business signup' }));
    expect(screen.getByRole('dialog', { name: 'signup' })).toHaveAttribute('data-initial-role', 'business');

    await user.click(screen.getByRole('button', { name: 'complete auth' }));

    expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({ role: 'business' }));
  });

  it('runs the pending continuation once after successful authentication', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    render(
      <AuthDialogProvider>
        <Harness onAuthenticated={onAuthenticated} />
      </AuthDialogProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'open login' }));
    await user.click(screen.getByRole('button', { name: 'complete auth' }));

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });

  it('does not run the pending continuation when authentication is cancelled', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    render(
      <AuthDialogProvider>
        <Harness onAuthenticated={onAuthenticated} />
      </AuthDialogProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'open login' }));
    await user.click(screen.getByRole('button', { name: 'close auth' }));

    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
