import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthModal from './AuthModal';

const login = vi.fn();
const signup = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login,
    signup,
    isAuthenticated: false,
  }),
}));

describe('AuthModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps every standalone form control and the remember row at least 44px tall', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'email' })).toHaveClass('h-11');
    expect(screen.getByLabelText('password')).toHaveClass('h-11');
    expect(screen.getByRole('button', { name: 'log in' })).toHaveClass('h-11');
    expect(screen.getByText('remember me').parentElement).toHaveClass('min-h-11');

    await user.click(screen.getByRole('button', { name: 'sign up' }));
    expect(screen.getByRole('textbox', { name: 'username' })).toHaveClass('h-11');
    expect(screen.getByRole('button', { name: 'sign up' })).toHaveClass('h-11');
  });

  it('keeps mode switches 44px clickable with the shared two-edge focus treatment', () => {
    render(<AuthModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'sign up' })).toHaveClass(
      'min-h-11',
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
      'focus-visible:ring-offset-foreground',
    );
  });
});
