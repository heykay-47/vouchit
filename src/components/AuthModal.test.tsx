import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthModal from './AuthModal';

const login = vi.fn();
const signup = vi.fn();
const authenticatedUser = {
  id: 'user-1',
  email: 'user@example.com',
  username: 'user',
  createdAt: new Date('2026-08-19T12:00:00.000Z'),
  role: 'customer' as const,
  redeemedVouchers: [],
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login,
    signup,
    isAuthenticated: false,
  }),
}));

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    login.mockResolvedValue(authenticatedUser);
    signup.mockResolvedValue(authenticatedUser);
    HTMLElement.prototype.hasPointerCapture = () => false;
    HTMLElement.prototype.setPointerCapture = () => {};
    HTMLElement.prototype.releasePointerCapture = () => {};
    HTMLElement.prototype.scrollIntoView = () => {};
  });

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

  it('reports successful login through the authentication callback', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    render(<AuthModal isOpen onClose={vi.fn()} onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByRole('textbox', { name: 'email' }), 'user@example.com');
    await user.type(screen.getByLabelText('password'), 'password');
    await user.click(screen.getByRole('button', { name: 'log in' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
  });

  it('reports successful signup through the authentication callback', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    render(<AuthModal isOpen initialMode="signup" onClose={vi.fn()} onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByRole('textbox', { name: 'email' }), 'new@example.com');
    await user.type(screen.getByRole('textbox', { name: 'username' }), 'newuser');
    await user.type(screen.getByLabelText('password'), 'password');
    await user.click(screen.getByRole('button', { name: 'sign up' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
  });

  it('preselects business signup and submits its accessible organization fields', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    const businessUser = { ...authenticatedUser, role: 'business' as const };
    signup.mockResolvedValueOnce(businessUser);
    render(
      <AuthModal
        isOpen
        initialMode="signup"
        initialRole="business"
        onClose={vi.fn()}
        onAuthenticated={onAuthenticated}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'account type' })).toHaveTextContent('business');
    await user.type(screen.getByRole('textbox', { name: 'email' }), 'ops@example.com');
    await user.type(screen.getByRole('textbox', { name: 'username' }), 'ops');
    await user.type(screen.getByRole('textbox', { name: 'organization name' }), 'Acme Offers');
    await user.type(screen.getByRole('textbox', { name: 'contact name' }), 'Asha Rao');
    await user.type(screen.getByRole('textbox', { name: 'website' }), 'https://acme.example');
    await user.type(screen.getByLabelText('password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'sign up' }));

    await waitFor(() => expect(signup).toHaveBeenCalledWith({
      role: 'business',
      email: 'ops@example.com',
      username: 'ops',
      password: 'secret123',
      rememberMe: true,
      organizationName: 'Acme Offers',
      contactName: 'Asha Rao',
      website: 'https://acme.example',
    }));
    expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({ role: 'business' }));
  });

  it('shows organization fields only after choosing the business role', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen initialMode="signup" onClose={vi.fn()} />);

    expect(screen.queryByRole('textbox', { name: 'organization name' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'account type' }));
    await user.click(screen.getByRole('option', { name: 'business' }));

    expect(screen.getByRole('textbox', { name: 'organization name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'contact name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'website' })).toBeInTheDocument();
  });

  it('requires passwords to have at least eight characters', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen initialMode="signup" onClose={vi.fn()} />);

    await user.type(screen.getByRole('textbox', { name: 'email' }), 'new@example.com');
    await user.type(screen.getByRole('textbox', { name: 'username' }), 'newuser');
    await user.type(screen.getByLabelText('password'), '1234567');
    const password = screen.getByLabelText('password');
    expect(password).toHaveAttribute('minLength', '8');
    fireEvent.submit(screen.getByRole('button', { name: 'sign up' }).closest('form')!);

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('does not report failed login through the authentication callback', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    login.mockRejectedValueOnce(new Error('invalid credentials'));
    render(<AuthModal isOpen onClose={vi.fn()} onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByRole('textbox', { name: 'email' }), 'user@example.com');
    await user.type(screen.getByLabelText('password'), 'password');
    await user.click(screen.getByRole('button', { name: 'log in' }));

    expect(await screen.findByText('invalid credentials')).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('does not report failed signup through the authentication callback', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    signup.mockRejectedValueOnce(new Error('email already exists'));
    render(<AuthModal isOpen initialMode="signup" onClose={vi.fn()} onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByRole('textbox', { name: 'email' }), 'new@example.com');
    await user.type(screen.getByRole('textbox', { name: 'username' }), 'newuser');
    await user.type(screen.getByLabelText('password'), 'password');
    await user.click(screen.getByRole('button', { name: 'sign up' }));

    expect(await screen.findByText('email already exists')).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
