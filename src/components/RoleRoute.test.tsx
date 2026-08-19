import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User, UserRole } from '@/lib/types';
import RoleRoute from './RoleRoute';

const authState = vi.hoisted(() => ({
  user: null as User | null,
  isLoading: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('./LoadingScreen', () => ({
  default: () => <div>loading</div>,
}));

const customer: User = {
  id: 'customer-1',
  email: 'customer@example.com',
  username: 'customer',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  role: 'customer',
  redeemedVouchers: [],
};

const business: User = {
  ...customer,
  id: 'business-1',
  email: 'business@example.com',
  username: 'business',
  role: 'business',
};

function renderRoleRoute(route: string, requiredRole: UserRole, user: User | null) {
  authState.user = user;
  authState.isLoading = false;

  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={<div>public home</div>} />
        <Route
          path="/dashboard"
          element={
            <RoleRoute role="customer">
              <div>customer dashboard</div>
            </RoleRoute>
          }
        />
        <Route
          path="/business"
          element={
            <RoleRoute role={requiredRole}>
              <div>business dashboard</div>
            </RoleRoute>
          }
        />
        <Route
          path="/donate"
          element={
            <RoleRoute role="customer">
              <div>donate page</div>
            </RoleRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleRoute', () => {
  beforeEach(() => {
    authState.user = null;
    authState.isLoading = false;
  });

  it('redirects anonymous users to the public home route', async () => {
    renderRoleRoute('/business', 'business', null);

    expect(await screen.findByText('public home')).toBeInTheDocument();
  });

  it('redirects a customer away from the business route', async () => {
    renderRoleRoute('/business', 'business', customer);

    expect(await screen.findByText('customer dashboard')).toBeInTheDocument();
  });

  it('redirects a business away from the customer dashboard', async () => {
    renderRoleRoute('/dashboard', 'business', business);

    expect(await screen.findByText('business dashboard')).toBeInTheDocument();
  });

  it('allows a customer to open customer-only routes', () => {
    renderRoleRoute('/donate', 'customer', customer);

    expect(screen.getByText('donate page')).toBeInTheDocument();
  });

  it('allows a business to open the business route', () => {
    renderRoleRoute('/business', 'business', business);

    expect(screen.getByText('business dashboard')).toBeInTheDocument();
  });

  it('renders the loading screen while authentication is resolving', () => {
    authState.user = null;
    authState.isLoading = true;

    render(
      <MemoryRouter initialEntries={['/business']}>
        <Routes>
          <Route
            path="/business"
            element={
              <RoleRoute role="business">
                <div>business dashboard</div>
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
  });
});
