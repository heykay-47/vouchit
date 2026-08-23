import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not send JSON content type for bodyless GET requests', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { ok: true }, error: null })));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/health');

    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.objectContaining({
      headers: {},
    }));
  });

  it('can suppress the auth event for an expected unauthorized response', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: null,
      error: { message: 'Invalid email or password', details: { field: 'credentials' } },
    }), { status: 401 }));
    const auth401 = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    window.addEventListener('auth:401', auth401);

    await expect(
      apiRequest('/api/auth/login', { method: 'POST' }, { suppressAuthEvent: true }),
    ).rejects.toMatchObject({
      status: 401,
      details: { field: 'credentials' },
    });

    expect(auth401).not.toHaveBeenCalled();
    window.removeEventListener('auth:401', auth401);
  });

  it('dispatches the auth event for an unsuppressed unauthorized response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: null,
      error: { message: 'Authentication required' },
    }), { status: 401 })));
    const auth401 = vi.fn();
    window.addEventListener('auth:401', auth401);

    await expect(apiRequest('/api/users/me')).rejects.toMatchObject({ status: 401 });

    expect(auth401).toHaveBeenCalledOnce();
    window.removeEventListener('auth:401', auth401);
  });
});
